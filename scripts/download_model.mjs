/**
 * Fetch the official COCO-SSD TensorFlow.js graph model and its weight shards.
 * Vercel runs this before vite build so the browser can load the model locally.
 */
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'public', 'models', 'coco-ssd');
const baseUrl = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/';
const timeoutMs = 120_000;

async function fetchAsset(name) {
  if (path.basename(name) !== name || name.includes('..')) {
    throw new Error('The model manifest contains an unsafe asset path.');
  }

  const target = path.join(destination, name);
  const temporary = target + '.tmp';
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(new URL(encodeURIComponent(name), baseUrl), {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' while downloading ' + name);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.byteLength) throw new Error('Downloaded ' + name + ' is empty.');
      await writeFile(temporary, bytes);
      await rename(temporary, target);
      return bytes.byteLength;
    } catch (error) {
      lastError = error;
      await rm(temporary, { force: true });
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }
  throw new Error('Unable to download ' + name + ': ' + (lastError?.message || 'network error'));
}

await mkdir(destination, { recursive: true });
const manifestPath = path.join(destination, 'model.json');
let manifest;
try {
  const existing = JSON.parse(await readFile(manifestPath, 'utf8'));
  const shards = existing.weightsManifest?.flatMap((group) => group.paths ?? []) ?? [];
  const complete = shards.length > 0 && (await Promise.all(
    [manifestPath, ...shards.map((name) => path.join(destination, name))]
      .map(async (file) => { try { return (await stat(file)).size > 0; } catch { return false; } }),
  )).every(Boolean);
  if (complete) manifest = existing;
} catch {
  // Download a fresh manifest below.
}

if (!manifest) {
  await fetchAsset('model.json');
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
}

const shards = [...new Set(manifest.weightsManifest?.flatMap((group) => group.paths ?? []) ?? [])];
if (!shards.length) throw new Error('The COCO-SSD model manifest does not list any weight shards.');

let totalBytes = (await stat(manifestPath)).size;
for (const shard of shards) {
  const file = path.join(destination, shard);
  try {
    if ((await stat(file)).size > 0) continue;
  } catch {
    // Download missing model shard.
  }
  totalBytes += await fetchAsset(shard);
}

console.log('COCO-SSD model ready: ' + shards.length + ' weight shard(s), ' + (totalBytes / 1024 / 1024).toFixed(1) + ' MB.');
