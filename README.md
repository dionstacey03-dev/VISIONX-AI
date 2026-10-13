# VISIONX-AI

Real-time identification of common objects using your camera or an uploaded image. COCO-SSD performs inference entirely in the browser with TensorFlow.js. No API keys or backend are required; images and camera frames are never sent to a server.

## Development

Requires Node.js 22.12+ and Python 3. Use the existing checkout; cloud tasks are already isolated and do not need Git worktrees.

```sh
cd /workspace/VISIONX-AI
npm ci --cache /workspace/.npm-cache
npm run model:download
npm run dev -- --port 5173
```

The model download requires HTTPS access to `storage.googleapis.com`. Dependencies require `registry.npmjs.org`. Downloaded weights live in ignored `public/models/` and must be retained with the environment snapshot or downloaded again. Vite copies them into `dist/` during a production build. Live server processes must restart in each new task.

Open the app in a browser, press **Start camera**, and allow camera permission. Use **Stop camera** to release the camera, or **Upload image** to analyze a local JPEG, PNG, or WebP. Adjust the threshold to filter uncertain predictions. Image input is limited to 20 MB and 25 megapixels.

Camera access requires a secure HTTPS origin or localhost. A cloud server cannot access the user's camera directly: the browser where the app is opened provides it. Serve `dist/` over HTTPS for deployment. Browser camera access from a plain HTTP remote address will not work.

## Validation

```sh
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

The browser test expects the development server on port 5173 (override with `APP_URL`). It checks the UI, image upload, model failure recovery, and camera permission handling. With model weights present, it additionally identifies people in a test photograph, verifies bounding boxes, and runs actual inference on a synthetic camera feed. Set `REQUIRE_MODEL=1` to fail rather than skip model checks when weights are absent. A physical camera and a real-world scene remain necessary to assess recognition accuracy on your target device.

## Scope

The pretrained COCO model detects 80 common classes, including people, vehicles, animals, furniture, and household objects. It does not identify every object, individual people, text, or custom product brands. Confidence scores are model estimates, not guarantees. Inference speed depends on device hardware and scene complexity; WebGL is preferred with a CPU fallback. Tabs pause inference while hidden. This is a first development version, not a safety-critical recognition system.
