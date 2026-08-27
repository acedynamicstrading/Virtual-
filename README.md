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
- A pale yellow wireframe sphere around the cube shows the actual grab
  radius the game logic checks against — makes the invisible hitbox
  visible instead of implied.
- The bottom-left panel is a live debug HUD: whether a plane/hand is
  currently found, the raw pinch ratio (vs. the 0.35 threshold), live
  distance from the pinch point to the cube (vs. the grab radius), and
  the per-frame hand-detection time in ms. Everything here reads the same
  state the actual grab logic uses, so if the HUD says you should have
  grabbed it and didn't, that's a real bug, not a stale/misleading number.
- The bottom-right debug canvas mirrors what the hand model is actually
  seeing, with the 21 tracked landmarks drawn as dots and a line between
  thumb tip and index tip (green when pinching) — useful for confirming
  exposure/framing/tracking-quality issues on your specific phone rather
  than guessing blind from the 3D view alone.

## Known rough edges (by design, for a first pass)

- **Hand-marker depth uses the placement plane, not general depth.** The
  marker is placed by casting a ray from the camera through the fingertip
  and intersecting it with the *one* real surface the cube was anchored
  to (captured once from the hit-test pose). This is accurate right at
  that surface, but it's not general-purpose depth sensing — reach your
  hand somewhere that isn't roughly on that plane (e.g. holding it up at
  head height, away from the floor) and the marker will project onto
  where that plane *would* be, not onto your actual hand position. Real
  depth (via the Depth API, where supported) is the next step once you
  need interactions that aren't tied to a single known surface.
- **Camera/render alignment is assumed, not verified per-device.** The
  fingertip's normalized image coordinates are mapped straight to NDC on
  the assumption that the raw camera texture shares the same FOV/aspect
  as the rendered view (which the WebXR spec requires, but device
  implementations can still vary slightly). If the marker feels
  consistently offset from your real fingertip rather than just laggy,
  this is the first thing to check.
- **Texture readback path is unoptimized.** `gl.readPixels` on the main
  thread is the simplest way to prove the concept works; it's not what
  you'd ship. Once the pipeline is confirmed on your device, the next
  step is moving the MediaPipe inference into a Web Worker with
  `OffscreenCanvas` so it stops competing with the render loop.
- **No movement/room-scale logic yet.** This prototype only exercises
  plane detection + hand tracking on a stationary test. Room-scale
  walking uses the same `local-floor` reference space and will layer on
  top of this once the camera-sharing pipeline is confirmed solid.

## Iterating on this while installed as a PWA

The service worker only re-checks for updates when **its own file's bytes
change** — editing `index.html` alone doesn't trigger that check, so an
already-installed PWA can keep serving an old cached page indefinitely
even after you've pushed real fixes. If a change doesn't seem to be
showing up on your phone, this is the first thing to suspect before
assuming the code itself is wrong.

**Every time you deploy a change while testing via the installed PWA**,
bump the version string in `sw.js`:

```js
const CACHE_NAME = "ar-pinch-shell-v2"; // increment this each deploy
```

That one-line diff is what makes the browser notice the worker changed
and re-fetch everything. Even then, expect to need **two closes/reopens**
of the app — the first load after a deploy is still served by the old
worker (it's already controlling the page), and the new one only takes
over after that.

**Faster loop for active development:** test in a normal Chrome tab
(not the installed home-screen icon) while iterating — it's subject to
the same service worker, but pulling to refresh / closing the tab
fully is more reliably a clean reload than relaunching an installed
PWA. Save PWA-icon testing for confirming things work end to end once
a change is stable.

## If `camera-access` isn't supported on your device

The app degrades gracefully (AR still works, hand tracking doesn't), and
logs which path it took. If that's the case on your phone, worth checking
Chrome version and confirming ARCore is up to date before concluding the
feature genuinely isn't available — this API is still relatively new and
rolling out unevenly across devices.
