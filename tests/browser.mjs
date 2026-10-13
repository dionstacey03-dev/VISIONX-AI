import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const url = process.env.APP_URL || 'http://localhost:5173';
const modelAvailable = existsSync(new URL('../public/models/coco-ssd/model.json', import.meta.url));
let passed = 0;
const errors = [];
mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true });
try {
  const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('heading', { name: 'See it. Identify it.' }).waitFor();
  assert.equal(await page.locator('#clear').isDisabled(), true);
  await page.locator('#threshold').fill('75');
  await page.locator('#threshold').dispatchEvent('input');
  assert.equal(await page.locator('#threshold-value').textContent(), '75%');
  console.log('PASS: startup and threshold controls'); passed++;

  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f1f1f1'; ctx.fillRect(0, 0, 320, 240);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const imageFile = { name: 'blank.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') };
  await page.route('**/models/coco-ssd/model.json', (route) => route.fulfill({ status: 503, body: 'model unavailable' }));
  await page.locator('#file').setInputFiles(imageFile);
  await page.waitForFunction(() => document.querySelector('#message').textContent.includes('Detection model unavailable'));
  assert.equal(await page.locator('#retry').isVisible(), true);
  assert.equal(await page.locator('#upload').isEnabled(), true);
  assert.equal(await page.locator('#photo').isVisible(), true);
  console.log('PASS: image upload, clear error, and retry control when model cannot load'); passed++;

  if (modelAvailable) {
    await page.unroute('**/models/coco-ssd/model.json');
    await page.locator('#retry').click();
    await page.waitForFunction(() => document.querySelector('#status-chip').textContent === 'COMPLETE', { timeout: 120_000 });
    assert.equal(await page.locator('#count').textContent(), '0');
    assert.match(await page.locator('#latency').textContent(), /\d+ ms/);
    console.log('PASS: actual COCO-SSD inference on blank image and model retry recovery'); passed++;
    await page.locator('#threshold').fill('50');
    await page.locator('#threshold').dispatchEvent('input');
    await page.locator('#file').setInputFiles(new URL('./fixtures/objects.jpg', import.meta.url).pathname);
    await page.waitForFunction(() => Number(document.querySelector('#count').textContent) > 0, { timeout: 120_000 });
    assert.match(await page.locator('#results').textContent(), /person/);
    assert.equal(await page.evaluate(() => {
      const canvas = document.querySelector('#overlay');
      return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((value) => value !== 0);
    }), true);
    console.log('PASS: real photograph identifies people and draws bounding boxes'); passed++;
    await page.screenshot({ path: new URL('../test-results/detection.png', import.meta.url).pathname, fullPage: true });
    await page.locator('#camera').click();
    await page.waitForFunction(() => document.querySelector('#status-chip').textContent === 'LIVE', { timeout: 120_000 });
    await page.waitForFunction(() => document.querySelector('#latency').textContent !== '—');
    await page.locator('#camera').click();
    assert.equal(await page.locator('#status-chip').textContent(), 'PAUSED');
    assert.equal(await page.evaluate(() => document.querySelector('#video').srcObject), null);
    console.log('PASS: synthetic camera inference and stream release on stop'); passed++;
  } else {
    console.log('SKIP: actual inference and synthetic camera tests — model weights missing');
    if (process.env.REQUIRE_MODEL === '1') throw new Error('Model is required but missing');
  }
  await page.locator('#clear').click();
  assert.equal(await page.locator('#empty-state').isVisible(), true);
  assert.equal(await page.locator('#count').textContent(), '0');
  assert.equal(await page.locator('#clear').isDisabled(), true);
  await page.locator('#file').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await page.waitForFunction(() => document.querySelector('#message').textContent.includes('could not be decoded'));
  console.log('PASS: clear/reset and invalid-image handling'); passed++;

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true });
  await page.reload();
  await page.screenshot({ path: new URL('../test-results/mobile.png', import.meta.url).pathname, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: new URL('../test-results/desktop.png', import.meta.url).pathname, fullPage: true });
  console.log('PASS: responsive layout without horizontal overflow'); passed++;
  await context.close();

  const deniedContext = await browser.newContext();
  const deniedPage = await deniedContext.newPage();
  await deniedPage.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  });
  await deniedPage.goto(url);
  await deniedPage.locator('#camera').click();
  await deniedPage.waitForFunction(() => document.querySelector('#message').textContent.includes('permission was denied'));
  assert.equal(await deniedPage.locator('#camera').isEnabled(), true);
  console.log('PASS: denied camera permission with actionable recovery'); passed++;
  await deniedContext.close();
  assert.deepEqual(errors, []);
  console.log(`${passed} browser checks passed; no uncaught page errors.`);
} finally { await browser.close(); }
