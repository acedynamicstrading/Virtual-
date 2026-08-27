# AR Pinch Prototype

Single-file WebXR + MediaPipe scaffold to validate the core pipeline before
building the full game: **AR plane detection + a shared camera feed for hand
pinch detection**, on one Android phone, one camera, one browser tab.

## What it proves

1. `immersive-ar` session starts and finds a real-world plane (hit-test).
2. The `camera-access` feature grabs the *same* camera texture the AR
   session already uses for tracking — no second camera stream.
3. That texture is read back to a small canvas and fed into MediaPipe's
   Hand Landmarker, throttled to every 3rd frame.
4. A pinch gesture (thumb + index tip close together) is detected and
   checked against the placed cube's position.

This is deliberately minimal — one cube, no anomalies, no room traversal
logic yet. The point is to confirm the plumbing works on your actual
device before the full horror-loop game gets built on top of it.

## Requirements

- **Android phone, Chrome browser, ARCore-capable device.** iOS Safari
  will not run this (`immersive-ar` isn't supported there) — confirmed
  when we scoped this earlier.
- **HTTPS hosting.** WebXR requires a secure context. `localhost` works
  for local testing, but for on-device testing you need real HTTPS —
  GitHub Pages works well for this and matches your existing stack.

## Deploying to GitHub Pages

```bash
# from a repo you want to serve this from
cp index.html /path/to/repo/
git add index.html
git commit -m "AR pinch prototype"
git push
# enable Pages in repo settings, then visit:
# https://<username>.github.io/<repo>/index.html
```

Open that URL on your Android phone in Chrome, then push all five files
(`index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`) — the manifest and service worker only work if
they're served from the same origin as `index.html`.

## Installing it as an app

In Chrome on Android: menu (⋮) → **Add to Home screen** / **Install app**.
That gives you a home-screen icon that launches straight into the
prototype with no address bar.

**What this does and doesn't change:**
- It does **not** change how camera/XR permissions are requested — those
  are still the same two browser prompts (AR session + `camera-access`),
  origin-scoped either way.
- It **does** mean that once you've granted them once, every future
  launch from the home-screen icon skips straight past the permission
  prompts (same as revisiting a tab you've already granted access to) —
  no re-typing the URL, no browser chrome in the way.
- The service worker only caches the local shell (HTML/manifest/icons).
  It deliberately leaves the three.js/MediaPipe CDN scripts alone, so
  you'll still need a connection the first time those load — after that,
  the browser's normal HTTP cache handles them.

## What to expect on first run

- You'll get **two separate permission prompts**: one for the AR session
  itself, one for raw camera pixel access (`camera-access`). If the second
  one is denied or unsupported on your Chrome version, the app still runs
  AR/plane detection — it just logs that hand tracking is disabled rather
  than crashing. That fallback path is worth deliberately testing once.
- Point the phone at a flat surface (floor or table) until a cube appears.
- Reach your free hand into the rear-camera view and pinch near the cube.
  The small blue/green sphere is the tracked pinch point (green = pinching).
- The bottom-right debug canvas mirrors what the hand model is actually
  seeing — useful for confirming exposure/framing issues on your specific
  phone rather than guessing blind.

## Known rough edges (by design, for a first pass)

- **Hand-marker 3D placement is approximate.** It projects the 2D pinch
  point in front of the camera at a fixed depth rather than using real
  depth data. Fine for validating detection; will need a proper approach
  (depth API, or anchoring interaction to hit-test results instead of
  raw 3D distance) before this feels right in the actual game.
- **Texture readback path is unoptimized.** `gl.readPixels` on the main
  thread is the simplest way to prove the concept works; it's not what
  you'd ship. Once the pipeline is confirmed on your device, the next
  step is moving the MediaPipe inference into a Web Worker with
  `OffscreenCanvas` so it stops competing with the render loop.
- **No movement/room-scale logic yet.** This prototype only exercises
  plane detection + hand tracking on a stationary test. Room-scale
  walking uses the same `local-floor` reference space and will layer on
  top of this once the camera-sharing pipeline is confirmed solid.

## If `camera-access` isn't supported on your device

The app degrades gracefully (AR still works, hand tracking doesn't), and
logs which path it took. If that's the case on your phone, worth checking
Chrome version and confirming ARCore is up to date before concluding the
feature genuinely isn't available — this API is still relatively new and
rolling out unevenly across devices.
