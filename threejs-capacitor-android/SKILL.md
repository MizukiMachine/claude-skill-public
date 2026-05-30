---
name: threejs-capacitor-android
description: "Build and ship Three.js apps on Capacitor Android with Vite and Gradle: GLTF loading, assets_index animation UI, OrbitControls mouse/touch mappings, and Android sync/run/signing troubleshooting."
---

# Three.js Capacitor Android

Build interactive Three.js apps that run in browser and ship in an Android native shell via Capacitor.
This skill focuses on the integration boundary where most breakage happens: web build output, animation contracts, controls, and native sync/run/signing workflow.

For the iOS target, use the `threejs-capacitor-ios` skill. The web/Three.js layer is identical between the two; only the native shell (Gradle/Android Studio vs SPM/Xcode) differs.

## Philosophy: Two Runtimes, One Contract

Treat the project as two systems that must agree:
- A web renderer runtime (Three.js + Vite)
- A native runtime wrapper (Capacitor Android)

Most failures happen when their contract is implicit.
Make file paths, animation names, build output, and Android build/signing choices explicit and testable.

**Before implementing, ask:**
- What is the exact web output directory (`dist` or `www`) and does Capacitor `webDir` match it?
- Are animation names loaded from data (`assets_index.json`) instead of hardcoded strings?
- Does the JDK match your Capacitor version (Android Studio bundles a compatible one; if set manually, follow the Capacitor environment-setup docs — e.g. Capacitor 8 → JDK 17+) and is `ANDROID_HOME`/SDK configured?
- Are desktop and touch controls intentionally mapped, or left to defaults that may not match product UX?

**Core principles:**
1. Contract-first data flow: UI and animation playback should derive from JSON metadata, not ad-hoc clip names in code.
2. Toolchain-first Android setup: matching JDK + Android SDK + Gradle aligned before debugging app logic.
3. Symmetric controls: define mouse and touch mappings together so desktop and mobile behavior stay aligned.
4. Build-sync discipline: every native run depends on fresh web assets and sync.
5. Fast diagnosis: prefer small runtime checks for paths, clip names, and action resolution before deep debugging.

## Quick Start Workflow

1. Build the Three.js app with Vite (`npm run build`).
2. Keep static assets under `public/` and load via absolute URLs (`/assets/...`).
3. Configure Capacitor with `webDir: "dist"`.
4. Add Android platform (`npx cap add android`).
5. Repeat day-to-day loop:
   - `npm run build`
   - `npx cap sync android`
   - `npx cap run android` or `npx cap open android`

For command-level details, see `references/capacitor-android-workflow.md`.

## Implementation Guidelines

### 1) Project Shape

Prefer this shape for minimal ambiguity:
- `index.html` and `src/*` for app code
- `public/assets/...` for GLBs and JSON contracts
- `capacitor.config.ts` with `webDir: "dist"`

If using Vite, keep all runtime fetches compatible with both browser and Android System WebView (Chromium):
- Good: `fetch('/assets/assets_index.json')`
- Avoid: filesystem paths or environment-specific base URLs unless intentionally configured.

Note on schemes: Android serves from `https://localhost` by default (`server.androidScheme`). Absolute `/assets/...` URLs resolve correctly under this scheme; avoid OS-specific filesystem paths.

### 2) Animation Contract via `assets_index.json`

Use one source of truth:
- Character skeleton URL
- Animation source URL
- `animations[]` entries with:
  - stable app id (`idle`, `walk`, `run`)
  - `sourceClipName` (exact `AnimationClip.name`)
  - loop mode and defaults

Runtime pattern:
1. Load index JSON
2. Load skeleton GLB and animation GLB
3. Resolve each UI button to a clip by `sourceClipName`
4. Build `AnimationAction` map keyed by app id
5. Play default action from index

See `references/threejs-animation-index-pattern.md`.

### 3) Controls: Desktop and Touch

Use `OrbitControls` and set mappings explicitly:
- Mouse:
  - left = rotate
  - wheel = dolly/zoom
  - right = pan
- Touch:
  - one-finger = rotate
  - two-finger = dolly + pan

Set `canvas.style.touchAction = 'none'` so the WebView does not hijack drag gestures for page scroll/zoom.
If product requires vertical-only pan, constrain target/camera translation after `controls.update()` each frame.
Do not silently change rotate/zoom semantics when adding this constraint.
Also handle the Android **hardware back button** via `@capacitor/app` so it does not close the app unexpectedly mid-interaction.

### 4) Performance and Stability Guardrails

- Cap pixel ratio: `Math.min(devicePixelRatio, 2)` (many Android screens are 3x–4x).
- Reuse mixer/actions; do not recreate per click.
- On resize, always update camera aspect, projection, and renderer size.
- Keep animation switching with fade transitions from metadata defaults.
- Handle `webglcontextlost`/`webglcontextrestored` — Android is aggressive about killing GL contexts under memory pressure or on backgrounding.
- Pause the render loop on the `pause` lifecycle event (`@capacitor/app`).

### 5) Capacitor Android Integration

Toolchain requirements:
- **JDK matching your Capacitor version** — you usually don't install it separately; Android Studio bundles a compatible JDK. If you set `JAVA_HOME` manually, follow the Capacitor environment-setup docs (e.g. Capacitor 8 → JDK 17+).
- **Android SDK + platform-tools** with `ANDROID_HOME` set and `adb` on PATH.
- **Android Studio** (or CLI Gradle) — runs on Windows, Linux (incl. WSL2), and macOS. No Mac required.

After native-side changes or plugin changes, run `npx cap sync android` again.
Release builds need your own keystore (debug builds auto-sign); see the workflow reference.

## Anti-Patterns to Avoid

❌ **Hardcoding clip names in UI handlers**
Why bad: a renamed clip in GLB silently breaks buttons.
Better: map buttons from `assets_index.json` and resolve clip names once at startup.

❌ **Wrong JDK / unconfigured SDK**
Why bad: Gradle fails with cryptic "unsupported class file" / "SDK location not found" errors.
Better: use the JDK Android Studio bundles (or the version the Capacitor docs specify), set `ANDROID_HOME`/`local.properties`, verify with `npx cap doctor`.

❌ **Running Android without rebuilding web assets**
Why bad: device/emulator shows stale JS/CSS and debugging becomes misleading.
Better: use scripts that always build before `cap sync`/`cap run`.

❌ **Leaving control mappings implicit**
Why bad: desktop and mobile interaction diverge from UX requirements; WebView eats touch gestures.
Better: set `mouseButtons`/`touches` explicitly and `touch-action: none` on the canvas.

❌ **Debugging native first for web contract errors**
Why bad: wastes time in Android Studio when issue is usually missing JSON keys, bad paths, or unresolved clips.
Better: add startup assertions/logs for index shape and clip resolution; use chrome://inspect to read WebView errors.

## Variation Guidance

**IMPORTANT**: Do not produce identical viewers by default.
Adjust implementation to the product intent:
- Character showcase: richer lighting, slower camera damping, emphasis on idle loop.
- Gameplay prototype: fast transitions, state-driven animation switching, minimal UI chrome.
- Asset QA tool: diagnostics overlay, clip length/track info, missing-clip warnings surfaced clearly.

Vary at least these dimensions intentionally:
- Visual style (lighting/background/floor treatment)
- Input tuning (damping/zoom/pan speeds)
- Animation UX (buttons, keyboard shortcuts, auto-play strategy)

Avoid converging on a single generic "orbit + three buttons" output when context calls for more.

## Resource Map

- `references/capacitor-android-workflow.md`
  - canonical Android setup, build/run commands, and signing
- `references/threejs-animation-index-pattern.md`
  - index contract and runtime loading pattern
- `references/gotchas.md`
  - high-frequency integration failures and fixes

## Remember

Three.js + Capacitor Android succeeds when contracts are explicit and workflows are disciplined.
Build a clear metadata contract, map controls intentionally, get the JDK/SDK toolchain aligned, and keep build/sync/run deterministic.
