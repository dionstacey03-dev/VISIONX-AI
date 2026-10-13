import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { visibleDetections, summarize } from './detections.js';
import './style.css';

document.querySelector('#app').innerHTML = `
  <header class="topbar"><a class="brand" href="/" aria-label="VISIONX-AI home"><span class="brand-icon">◈</span> VISIONX<span class="muted"> / AI</span></a><span class="privacy"><span class="dot"></span> On-device intelligence</span></header>
  <main>
    <div class="intro"><div><p class="eyebrow">COMPUTER VISION WORKSPACE</p><h1>See it. <span>Identify it.</span></h1><p class="subtitle">Understand the world in front of your camera, in real time.</p></div><span class="model-tag">COCO-SSD <span>· 80 object classes</span></span></div>
    <div class="workspace">
      <section class="viewer-panel" aria-label="Object detection viewer">
        <div class="panel-top"><span><span class="dot" id="live-dot"></span> <span id="source-label">LIVE VIEW</span></span><span id="status-chip">STANDBY</span></div>
        <div id="viewport" class="viewport">
          <video id="video" playsinline muted hidden></video><img id="photo" alt="Uploaded image for object identification" hidden /><canvas id="overlay" aria-label="Object bounding boxes" hidden></canvas>
          <div id="empty-state"><div class="view-icon">⌖</div><h2>A new perspective awaits</h2><p>Start your camera or upload an image<br />to discover the objects around you.</p><span class="frame-corner corner-tl"></span><span class="frame-corner corner-tr"></span><span class="frame-corner corner-bl"></span><span class="frame-corner corner-br"></span></div>
          <span id="viewport-badge" hidden>LOCAL INFERENCE</span>
        </div>
        <div class="controls"><button id="camera" class="primary">◉ <span>Start camera</span></button><button id="upload" class="secondary">↑ Upload image</button><input id="file" type="file" accept="image/*" hidden /><button id="clear" class="text-button" disabled>Clear</button><span class="control-note">Your images stay on your device</span></div>
        <div id="message" role="status" aria-live="polite">Ready when you are. Camera access requires HTTPS or localhost.</div>
        <button id="retry" class="text-button" hidden>Retry model loading</button>
      </section>
      <aside class="inspector">
        <section class="results-panel"><div class="section-heading"><h2>Detected objects</h2><span id="count">0</span></div><p class="section-note">What your camera sees, at a glance.</p><div id="results"><div class="no-results"><span>◎</span><p>No objects identified yet</p><small>Results will appear here as you scan.</small></div></div></section>
        <section class="settings-panel"><p class="eyebrow">DETECTION SETTINGS</p><label for="threshold">Confidence threshold <output id="threshold-value">50%</output></label><input id="threshold" type="range" min="20" max="95" value="50" step="5" /><div class="range-labels"><span>More detections</span><span>Higher certainty</span></div><div class="stats"><div><span>Inference time</span><strong id="latency">—</strong></div><div><span>Processing</span><strong id="backend">On device</strong></div></div></section>
        <div class="tip"><span>✦</span><p><strong>A little light goes a long way.</strong><br />Use good lighting and keep objects in frame for clearer results.</p></div>
      </aside>
    </div>
    <footer><span><span class="dot"></span> Private by design. No image uploads to a server.</span><span>VISIONX-AI <span class="muted"> / </span> REAL-TIME OBJECT IDENTIFICATION</span></footer>
  </main>`;

const $ = (selector) => document.querySelector(selector);
const video = $('#video');
const photo = $('#photo');
const canvas = $('#overlay');
const context = canvas.getContext('2d');
let model;
let loading;
let stream;
let generation = 0;
let currentSource;
let lastPredictions = [];
let busy = false;
const inferenceCanvas = document.createElement('canvas');
const inferenceContext = inferenceCanvas.getContext('2d');
let inferenceQueue = Promise.resolve();

function message(text, error = false) {
  $('#message').textContent = text;
  $('#message').classList.toggle('error', error);
}

async function loadModel() {
  if (model) return model;
  if (loading) return loading;
  $('#retry').hidden = true;
  message('Loading the detection model. The first load may take a moment…');
  $('#status-chip').textContent = 'LOADING';
  loading = (async () => {
    try {
      let webgl = false;
      try { webgl = await tf.setBackend('webgl'); } catch { /* CPU fallback below */ }
      if (!webgl) await tf.setBackend('cpu');
      await tf.ready();
      // Models are served locally after npm run model:download; no remote inference.
      model = await cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: `${import.meta.env.BASE_URL}models/coco-ssd/model.json` });
      $('#backend').textContent = tf.getBackend() === 'webgl' ? 'WebGL' : 'CPU';
      return model;
    } catch (error) {
      $('#retry').hidden = false;
      $('#status-chip').textContent = 'MODEL UNAVAILABLE';
      throw new Error('Detection model unavailable. Run npm run model:download, then retry. Check network access to storage.googleapis.com.');
    } finally { loading = undefined; }
  })();
  return loading;
}

function setBusy(value) {
  busy = value;
  $('#camera').disabled = value;
  $('#upload').disabled = value;
  $('#clear').disabled = value || !currentSource;
  $('#retry').disabled = value;
}

function stopCamera() {
  generation += 1;
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  video.srcObject = null;
  $('#camera span').textContent = 'Start camera';
  $('#live-dot').classList.remove('active');
}

function showSource(source) {
  currentSource = source;
  video.hidden = source !== video;
  photo.hidden = source !== photo;
  canvas.hidden = false;
  $('#empty-state').hidden = true;
  $('#viewport-badge').hidden = false;
  $('#clear').disabled = false;
  $('#source-label').textContent = source === video ? 'LIVE VIEW' : 'IMAGE VIEW';
}

function render() {
  if (!currentSource) return;
  const width = currentSource === video ? video.videoWidth : photo.naturalWidth;
  const height = currentSource === video ? video.videoHeight : photo.naturalHeight;
  if (!width || !height) return;
  canvas.width = width;
  canvas.height = height;
  $('#viewport').style.aspectRatio = `${width} / ${height}`;
  const predictions = visibleDetections(lastPredictions, Number($('#threshold').value) / 100);
  const scale = Math.max(width / 850, 0.7);
  context.lineWidth = 2.5 * scale;
  context.font = `600 ${16 * scale}px system-ui`;
  for (const prediction of predictions) {
    const [x, y, w, h] = prediction.bbox;
    context.strokeStyle = '#a8f080';
    context.strokeRect(x, y, w, h);
    const label = `${prediction.class}  ${Math.round(prediction.score * 100)}%`;
    const labelWidth = context.measureText(label).width + 16 * scale;
    const labelHeight = 28 * scale;
    const labelX = Math.min(Math.max(0, x), Math.max(0, width - labelWidth));
    const labelY = Math.min(Math.max(0, y - labelHeight), Math.max(0, height - labelHeight));
    context.fillStyle = '#a8f080';
    context.fillRect(labelX, labelY, labelWidth, labelHeight);
    context.fillStyle = '#142019';
    context.fillText(label, labelX + 8 * scale, labelY + 19 * scale);
  }
  $('#count').textContent = predictions.length;
  const results = $('#results');
  results.replaceChildren();
  if (!predictions.length) {
    results.innerHTML = '<div class="no-results"><span>◎</span><p>No objects above the threshold</p><small>Try better lighting or a lower threshold.</small></div>';
  }
  for (const group of summarize(predictions)) {
    const row = document.createElement('div');
    row.className = 'object-row';
    const title = document.createElement('div');
    title.className = 'object-title';
    const name = document.createElement('strong');
    name.textContent = group.label;
    const confidence = document.createElement('span');
    confidence.textContent = `${Math.round(group.score * 100)}%`;
    title.append(name, confidence);
    const detail = document.createElement('small');
    detail.textContent = `${group.count} ${group.count === 1 ? 'instance' : 'instances'} detected`;
    const bar = document.createElement('div');
    bar.className = 'confidence-bar';
    const fill = document.createElement('span');
    fill.style.width = `${group.score * 100}%`;
    bar.append(fill);
    row.append(title, detail, bar);
    results.append(row);
  }
}

function infer(source, token) {
  const task = inferenceQueue.then(async () => {
    if (token !== generation) return;
    const start = performance.now();
    const width = source === video ? video.videoWidth : photo.naturalWidth;
    const height = source === video ? video.videoHeight : photo.naturalHeight;
    const ratio = Math.min(1, 960 / Math.max(width, height));
    inferenceCanvas.width = Math.max(1, Math.round(width * ratio));
    inferenceCanvas.height = Math.max(1, Math.round(height * ratio));
    inferenceContext.drawImage(source, 0, 0, inferenceCanvas.width, inferenceCanvas.height);
    const predictions = await model.detect(inferenceCanvas, 20, 0.2);
    if (token !== generation) return;
    // Inference dimensions are independent of the image's CSS display size.
    lastPredictions = predictions.map((prediction) => ({ ...prediction, bbox: prediction.bbox.map((value, index) => value * (index % 2 === 0 ? width / inferenceCanvas.width : height / inferenceCanvas.height)) }));
    $('#latency').textContent = `${Math.round(performance.now() - start)} ms`;
    render();
  });
  inferenceQueue = task.catch(() => {});
  return task;
}

async function loop(token) {
  if (token !== generation || !stream) return;
  try {
    if (!document.hidden && video.readyState >= 2) await infer(video, token);
    if (token === generation && stream) requestAnimationFrame(() => loop(token));
  } catch (error) {
    if (token !== generation) return;
    stopCamera();
    $('#status-chip').textContent = 'PAUSED';
    message(`Detection stopped: ${error.message}`, true);
  }
}

$('#camera').addEventListener('click', async () => {
  if (stream) {
    stopCamera();
    $('#status-chip').textContent = 'PAUSED';
    message('Camera stopped. The last detections remain visible.');
    return;
  }
  setBusy(true);
  let captured;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.');
    captured = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    await loadModel();
    stopCamera();
    stream = captured;
    video.srcObject = stream;
    await video.play();
    lastPredictions = [];
    showSource(video);
    $('#latency').textContent = '—';
    $('#camera span').textContent = 'Stop camera';
    $('#live-dot').classList.add('active');
    $('#status-chip').textContent = 'LIVE';
    message('Camera active. Identifying objects on your device.');
    const token = generation;
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (token !== generation) return;
      stopCamera();
      $('#status-chip').textContent = 'PAUSED';
      message('Camera disconnected. Reconnect it and start again.', true);
    });
    loop(token);
  } catch (error) {
    captured?.getTracks().forEach((track) => track.stop());
    if (stream === captured) stopCamera();
    if (!$('#retry').hidden) $('#status-chip').textContent = 'MODEL UNAVAILABLE';
    else $('#status-chip').textContent = 'STANDBY';
    message(error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser or upload an image.' : error.name === 'NotFoundError' ? 'No camera found. Connect a camera or upload an image.' : error.message, true);
  } finally { setBusy(false); }
});

$('#upload').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { message('Choose an image file such as JPEG, PNG, or WebP.', true); return; }
  if (file.size > 20 * 1024 * 1024) { message('Choose an image smaller than 20 MB.', true); return; }
  setBusy(true);
  stopCamera();
  const url = URL.createObjectURL(file);
  try {
    photo.src = url;
    await photo.decode();
    if (photo.naturalWidth * photo.naturalHeight > 25_000_000) throw new Error('Choose an image smaller than 25 megapixels.');
    lastPredictions = [];
    showSource(photo);
    render();
    await loadModel();
    await infer(photo, generation);
    $('#status-chip').textContent = 'COMPLETE';
    message('Image analyzed locally. Adjust the confidence threshold to filter results.');
  } catch (error) {
    message(error.name === 'EncodingError' ? 'This image could not be decoded. Choose a JPEG, PNG, or WebP image.' : error.message, true);
    if ($('#retry').hidden) $('#status-chip').textContent = 'ERROR';
  } finally { URL.revokeObjectURL(url); setBusy(false); }
});

$('#retry').addEventListener('click', async () => {
  setBusy(true);
  try {
    await loadModel();
    if (currentSource === photo) { await infer(photo, generation); $('#status-chip').textContent = 'COMPLETE'; message('Image analyzed locally.'); }
    else { $('#status-chip').textContent = 'READY'; message('Model ready. Start your camera or upload an image.'); }
  } catch (error) { message(error.message, true); }
  finally { setBusy(false); }
});

$('#threshold').addEventListener('input', () => { $('#threshold-value').value = `${$('#threshold').value}%`; render(); });
$('#clear').addEventListener('click', () => {
  if (busy) return;
  stopCamera();
  currentSource = undefined;
  lastPredictions = [];
  video.hidden = photo.hidden = canvas.hidden = true;
  photo.removeAttribute('src');
  $('#empty-state').hidden = false;
  $('#viewport-badge').hidden = true;
  $('#viewport').style.aspectRatio = '';
  $('#count').textContent = '0';
  $('#latency').textContent = '—';
  $('#source-label').textContent = 'LIVE VIEW';
  $('#status-chip').textContent = 'STANDBY';
  $('#results').innerHTML = '<div class="no-results"><span>◎</span><p>No objects identified yet</p><small>Results will appear here as you scan.</small></div>';
  $('#clear').disabled = true;
  message('Ready when you are. Start your camera or upload an image.');
});
window.addEventListener('pagehide', stopCamera);
