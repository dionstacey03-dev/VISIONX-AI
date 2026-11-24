import { visibleDetections, summarize } from './detections.js';
import './style.css';

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="/" aria-label="VISIONX-AI home"><span class="brand-mark">V<span>X</span></span><span class="brand-name">VISIONX<span class="brand-muted">.AI</span><small>VISION INTELLIGENCE STUDIO</small></span></a>
    <div class="topbar-center"><span class="topbar-pulse"></span> PRIVATE IN-BROWSER PROCESSING <span class="topbar-divider">/</span> COCO-SSD ENGINE</div>
    <div class="topbar-right"><span class="system-status"><i class="dot"></i> SYSTEM READY</span><span class="version-pill">V 2.0</span></div>
  </header>
  <main class="app-shell">
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow"><span class="eyebrow-line"></span> COMPUTER VISION / WORKSPACE 01</p><h1>Give your world<br /><span>a second look.</span></h1><p class="subtitle">An intelligent lens for the objects around you. Scan live or drop in an image — recognition happens privately on your device.</p></div>
      <div class="hero-side"><div class="engine-card"><span class="engine-orbit">✳</span><div><small>ACTIVE MODEL</small><strong>COCO-SSD</strong><span>80 object categories · TensorFlow.js</span></div><span class="engine-ready">READY</span></div><div class="hero-caption">01 <span>—</span> SEE MORE. KNOW MORE.</div></div>
    </section>
    <section class="workspace" aria-label="Object detection workspace">
      <section class="viewer-panel" aria-label="Object detection viewer">
        <div class="panel-top"><div class="panel-title"><span class="panel-index">01</span><div><strong>VISION FEED</strong><small>LIVE DETECTION CANVAS</small></div></div><div class="viewer-status"><span class="dot" id="live-dot"></span><span id="source-label">AWAITING INPUT</span><span class="status-chip" id="status-chip">STANDBY</span></div></div>
        <div id="viewport" class="viewport">
          <video id="video" playsinline muted hidden></video><img id="photo" alt="Uploaded image for object identification" hidden /><canvas id="overlay" aria-label="Object bounding boxes" hidden></canvas>
          <div id="empty-state"><div class="scan-graphic"><span class="scan-ring ring-one"></span><span class="scan-ring ring-two"></span><span class="scan-crosshair">⌖</span><span class="scan-spark spark-one"></span><span class="scan-spark spark-two"></span></div><p class="empty-kicker">YOUR VISION STARTS HERE</p><h2>Bring something into focus.</h2><p class="empty-description">Start your camera or upload an image<br />to reveal the objects hiding in plain sight.</p><span class="frame-corner corner-tl"></span><span class="frame-corner corner-tr"></span><span class="frame-corner corner-bl"></span><span class="frame-corner corner-br"></span><span class="viewport-coordinate coord-left">VX / 001</span><span class="viewport-coordinate coord-right">AI VISION SYSTEM</span></div>
          <span id="viewport-badge" hidden>● LOCAL INFERENCE</span>
        </div>
        <div class="viewer-toolbar"><div class="toolbar-actions"><button id="camera" class="primary"><span class="button-icon">◉</span><span>Start camera</span></button><button id="upload" class="secondary"><span class="button-icon">↥</span> Upload image</button><button id="capture" class="secondary snapshot-button" disabled><span class="button-icon">↧</span> Save snapshot</button><input id="file" type="file" accept="image/*" hidden /><button id="clear" class="text-button" disabled>Reset view</button></div><div class="privacy-note"><span class="privacy-lock">⌑</span> 100% ON-DEVICE</div></div>
        <div class="viewer-feedback"><span class="feedback-pulse"></span><span id="message" role="status" aria-live="polite">Ready when you are. Camera access requires HTTPS or localhost.</span><button id="retry" class="text-button retry-button" hidden>Retry model loading ↗</button></div>
      </section>
      <aside class="inspector">
        <section class="results-panel">
          <div class="section-heading"><div><p class="eyebrow">ANALYSIS / 01</p><h2>What we see<span>.</span></h2></div><span class="count-pill"><strong id="count">0</strong><small>FOUND</small></span></div>
          <p class="section-note">Recognized objects appear here as the vision engine processes your input.</p>
          <div class="results-divider"><span>OBJECT BREAKDOWN</span><span>CONFIDENCE</span></div>
          <div id="results"><div class="no-results"><span class="no-results-icon">⌖</span><p>Nothing in frame yet</p><small>Start a scan to populate your results.</small></div></div>
        </section>
        <section class="settings-panel">
          <div class="section-heading compact-heading"><div><p class="eyebrow">TUNING / 02</p><h2>Detection controls<span>.</span></h2></div><span class="settings-glyph">⌘</span></div>
          <label for="threshold"><span>Confidence threshold</span><output id="threshold-value">50%</output></label>
          <input id="threshold" type="range" min="20" max="95" value="50" step="5" />
          <div class="range-labels"><span>More detections</span><span>Higher certainty</span></div>
          <div class="metric-grid"><div class="metric"><small>INFERENCE TIME</small><strong id="latency">—</strong></div><div class="metric"><small>PROCESSOR</small><strong id="backend">On device</strong></div></div>
        </section>
        <section class="settings-panel camera-settings">
          <div class="section-heading compact-heading"><div><p class="eyebrow">INPUT / 03</p><h2>Capture setup<span>.</span></h2></div><span class="settings-glyph">◉</span></div>
          <label for="camera-select">Camera source</label><select id="camera-select"><option value="">Automatic (prefer rear camera)</option></select>
          <label for="mode">Processing profile</label><select id="mode"><option value="fast">Fast · lower resolution</option><option value="accurate" selected>Accurate · higher resolution</option></select>
          <p class="section-note setting-hint">Fast uses up to 480 pixels; Accurate uses up to 960. Both use the same model.</p>
          <div class="metric-grid single-metric"><div class="metric"><small>DETECTION FRAME RATE</small><strong id="fps">—</strong></div><div class="metric"><small>MODEL CLASSES</small><strong>80</strong></div></div>
        </section>
        <div class="tip"><span class="tip-icon">✳</span><p><strong>Pro tip</strong><br />Good lighting and a steady frame help the model identify objects more accurately.</p></div>
      </aside>
    </section>
    <footer><div class="footer-brand"><span class="brand-mark small-mark">V<span>X</span></span><span>VISIONX.AI</span></div><span class="footer-privacy"><i class="dot"></i> Your images never leave this device.</span><span class="footer-meta">BUILT FOR CLARITY <b>·</b> POWERED BY TENSORFLOW.JS</span></footer>
  </main>`;

const $ = (selector) => document.querySelector(selector);
const video = $('#video');
const photo = $('#photo');
const canvas = $('#overlay');
const context = canvas.getContext('2d');
let model;
let loading;
let tf;
let cocoSsd;
let stream;
let generation = 0;
let currentSource;
let photoUrl;
let lastPredictions = [];
let busy = false;
const inferenceCanvas = document.createElement('canvas');
const inferenceContext = inferenceCanvas.getContext('2d');
let inferenceQueue = Promise.resolve();
const resultFrame = document.createElement('canvas');
resultFrame.width = 0;
let frameTimes = [];

async function refreshCameras() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
    const select = $('#camera-select');
    const selected = select.value;
    select.replaceChildren(new Option('Automatic (prefer rear camera)', ''));
    devices.filter((device) => device.deviceId).forEach((device, index) => select.add(new Option(device.label || `Camera ${index + 1}`, device.deviceId)));
    select.value = devices.some((device) => device.deviceId === selected) ? selected : '';
  } catch { /* Camera permission may be required before devices can be listed. */ }
}

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
      // Load the machine-learning runtime only when inference is first requested.
      // This keeps the initial interface bundle small and defers model code until needed.
      const [tensorflowModule, cocoSsdModule] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]);
      tf = tensorflowModule;
      cocoSsd = cocoSsdModule;
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
  $('#camera-select').disabled = value;
  $('#mode').disabled = value;
  $('#capture').disabled = value || !resultFrame.width;
}

function stopCamera() {
  generation += 1;
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  video.srcObject = null;
  $('#camera span').textContent = 'Start camera';
  $('#live-dot').classList.remove('active');
  frameTimes = [];
  $('#fps').textContent = '—';
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
  const width = currentSource === video ? (video.videoWidth || canvas.width) : photo.naturalWidth;
  const height = currentSource === video ? (video.videoHeight || canvas.height) : photo.naturalHeight;
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
    const maxSize = $('#mode').value === 'fast' ? 480 : 960;
    const ratio = Math.min(1, maxSize / Math.max(width, height));
    inferenceCanvas.width = Math.max(1, Math.round(width * ratio));
    inferenceCanvas.height = Math.max(1, Math.round(height * ratio));
    inferenceContext.drawImage(source, 0, 0, inferenceCanvas.width, inferenceCanvas.height);
    const predictions = await model.detect(inferenceCanvas, 20, 0.2);
    if (token !== generation) return;
    resultFrame.width = inferenceCanvas.width;
    resultFrame.height = inferenceCanvas.height;
    resultFrame.getContext('2d').drawImage(inferenceCanvas, 0, 0);
    // Inference dimensions are independent of the image's CSS display size.
    lastPredictions = predictions.map((prediction) => ({ ...prediction, bbox: prediction.bbox.map((value, index) => value * (index % 2 === 0 ? width / inferenceCanvas.width : height / inferenceCanvas.height)) }));
    $('#latency').textContent = `${Math.round(performance.now() - start)} ms`;
    render();
    $('#capture').disabled = busy;
    if (source === video) {
      frameTimes.push(performance.now());
      frameTimes = frameTimes.slice(-10);
      if (frameTimes.length > 1) $('#fps').textContent = `${((frameTimes.length - 1) * 1000 / (frameTimes.at(-1) - frameTimes[0])).toFixed(1)} fps`;
    }
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

async function startCamera() {
  setBusy(true);
  stopCamera();
  resultFrame.width = 0;
  $('#capture').disabled = true;
  let captured;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.');
    const deviceId = $('#camera-select').value;
    captured = await navigator.mediaDevices.getUserMedia({ video: { ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }), width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    await refreshCameras();
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
}

$('#camera').addEventListener('click', async () => {
  if (stream) {
    stopCamera();
    $('#status-chip').textContent = 'PAUSED';
    message('Camera stopped. You can save the last analyzed frame.');
  } else await startCamera();
});
$('#camera-select').addEventListener('change', async () => { if (stream && !busy) await startCamera(); });
navigator.mediaDevices?.addEventListener('devicechange', refreshCameras);
refreshCameras();

$('#mode').addEventListener('change', async () => {
  frameTimes = [];
  $('#fps').textContent = '—';
  if (currentSource !== photo || !model || busy) return;
  setBusy(true);
  try { await infer(photo, generation); message('Image reanalyzed using the selected detection mode.'); }
  catch (error) { message(error.message, true); }
  finally { setBusy(false); }
});

$('#capture').addEventListener('click', () => {
  if (!resultFrame.width || busy) return;
  const snapshot = document.createElement('canvas');
  snapshot.width = resultFrame.width;
  snapshot.height = resultFrame.height;
  const ctx = snapshot.getContext('2d');
  ctx.drawImage(resultFrame, 0, 0);
  ctx.drawImage(canvas, 0, 0, snapshot.width, snapshot.height);
  snapshot.toBlob((blob) => {
    if (!blob) { message('Snapshot could not be saved. Try again.', true); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visionx-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    message('Snapshot saved with the visible labels and bounding boxes.');
  }, 'image/png');
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
  resultFrame.width = 0;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  try {
    photo.src = photoUrl;
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
  } finally {
    setBusy(false);
  }
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
  resultFrame.width = 0;
  $('#capture').disabled = true;
  video.hidden = photo.hidden = canvas.hidden = true;
  photo.removeAttribute('src');
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = undefined;
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
window.addEventListener('pagehide', () => {
  stopCamera();
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});
document.addEventListener('visibilitychange', () => { frameTimes = []; $('#fps').textContent = '—'; });
