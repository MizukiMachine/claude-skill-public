# Gotchas and Fast Fixes for Capacitor iOS Three.js Apps

## Browser Works but Simulator/Device Fails

Common causes:
- stale native web assets
- `webDir` mismatch
- bad static asset path
- production build accidentally using `server.url`
- WKWebView console error hidden from normal terminal output

Fix:
1. `npm run build`
2. `npx cap sync ios`
3. confirm `capacitor.config.*` uses the actual output dir, usually `webDir: 'dist'`
4. use `/assets/...` URLs for files under `public/assets`
5. remove `server.url` unless live reload is intentional
6. inspect the WebView with Safari Develop tools

## Animation Button Does Nothing

Common causes:
- `sourceClipName` mismatch
- clip exists in a different GLB than expected
- default action id missing
- UI was hardcoded and drifted from asset metadata

Fix:
- list available `AnimationClip.name` values
- compare exact strings with `assets_index.json`
- warn at startup for unresolved entries
- build UI from metadata ids, not raw clip names

## Touch Pan/Rotate Feels Wrong or Gestures Scroll the Page

Common causes:
- missing `touch-action: none` on the canvas
- default `OrbitControls` mappings not aligned with UX
- custom pan constraint applied before `controls.update()`
- overlay UI absorbing pointer events unintentionally
- controls placed under notch/home indicator safe areas

Fix:
- set `canvas.style.touchAction = 'none'`
- set both `mouseButtons` and `touches` explicitly
- apply pan/camera constraints after `controls.update()`
- check CSS `pointer-events` on overlays
- use `env(safe-area-inset-*)` for edge controls

## Black Screen After Backgrounding

Common causes:
- WebGL context lost under memory pressure
- render loop kept running while backgrounded
- textures/render targets not recreated after context restore

Fix:
- listen for `webglcontextlost`, call `event.preventDefault()`, and pause rendering
- listen for `webglcontextrestored` and recreate renderer-dependent resources if needed
- pause on Capacitor `App.addListener('pause', ...)`
- resume intentionally on `App.addListener('resume', ...)`

## Capacitor Asks for CocoaPods or Xcode Shape Looks Wrong

Common causes:
- project was created with an older Capacitor template
- SPM and CocoaPods assumptions are mixed
- plugin does not support SPM cleanly
- generated `CapApp-SPM` files were edited manually

Fix:
- use one package manager strategy per project
- for modern projects, add iOS with `npx cap add ios --packagemanager SPM`
- for existing CocoaPods projects, migrate intentionally with `npx cap spm-migration-assistant` or recreate `ios/` after backing up native changes
- do not edit generated SPM package internals; let `npx cap sync ios` manage them

## Xcode Build, Signing, or Package Resolution Fails

Common causes:
- wrong Xcode version for the Capacitor major version
- Command Line Tools not selected
- stale Derived Data
- signing team/bundle id mismatch
- package resolution cache is stale

Fix:
- verify `xcode-select -p`
- run `npx cap doctor`
- open with `npx cap open ios`
- use Xcode Product > Clean Build Folder
- remove Derived Data only after simpler checks
- resolve packages in Xcode
- verify bundle id, team, provisioning, and capabilities

## Plugin Not Implemented on iOS

Common causes:
- plugin installed in `package.json` but not synced into native project
- using a plugin that does not support the selected package manager
- missing permission strings or capabilities

Fix:
- run `npx cap sync ios`
- inspect package dependencies or CocoaPods integration depending on project type
- confirm required `Info.plist` usage strings
- confirm Signing & Capabilities match plugin requirements

## WebGL Is Slow or Janky on High-DPI iOS

Common causes:
- pixel ratio set to full `devicePixelRatio`
- expensive shadows/post-processing enabled by default
- render loop runs while app is paused
- too many draw calls/material variants

Fix:
- use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- profile before adding post-processing
- pause on app `pause`
- batch/reuse geometry and materials where practical
- reduce texture sizes for mobile builds when assets are oversized
