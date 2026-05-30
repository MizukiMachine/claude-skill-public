# Gotchas and Fast Fixes (Android)

## 1) "It works in browser but not on device/emulator"

Common causes:
- stale native web assets
- incorrect `webDir`
- bad static asset path

Fix:
1. `npm run build`
2. `npx cap sync android`
3. confirm `capacitor.config.*` uses `webDir: 'dist'`
4. use `/assets/...` URLs for files under `public/assets`
5. open chrome://inspect (USB + USB debugging) to read WebView JS/WebGL errors

## 2) "Animation button does nothing"

Common causes:
- `sourceClipName` mismatch
- clip exists in different GLB than expected

Fix:
- inspect available clips
- compare exact string names
- warn at startup for unresolved entries

## 3) "Pan behavior feels wrong on touch" / "gestures scroll the page"

Common causes:
- missing `touch-action: none` on the canvas (WebView hijacks gestures)
- default `OrbitControls` mappings not aligned with UX
- custom pan constraint applied before `controls.update()`

Fix:
- set `canvas.style.touchAction = 'none'`
- set both `mouseButtons` and `touches` explicitly
- apply custom pan constraint after update in render loop

## 4) "Black screen after backgrounding"

Common causes:
- WebGL context lost under memory pressure (Android is aggressive)
- render loop kept running while backgrounded

Fix:
- handle `webglcontextlost` (call `preventDefault()`) + `webglcontextrestored`
- pause the loop on the `pause` lifecycle event via `@capacitor/app`

## 5) "Gradle / JDK errors"

Common causes:
- wrong JDK for your Capacitor version (e.g. Capacitor 8 → JDK 17+)
- SDK location not found

Fix:
- prefer the JDK Android Studio bundles; if overriding, set the Gradle JDK and `JAVA_HOME` to the version the Capacitor docs specify
- create `android/local.properties` with `sdk.dir=...` or set `ANDROID_HOME`
- `cd android && ./gradlew --stop && ./gradlew clean` then retry
- run `npx cap doctor`

## 6) "Hardware back button closes the app unexpectedly"

Fix:
- listen with `@capacitor/app`: `App.addListener('backButton', ...)` and
  decide whether to navigate UI, reset camera, or allow exit.

## 7) "Device not detected"

Fix:
- `adb devices` should list it; enable Developer options + USB debugging,
  accept the RSA prompt. For emulators, ensure the AVD uses hardware GL.
