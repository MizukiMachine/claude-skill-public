# Capacitor Android Workflow (Three.js Apps)

## Toolchain

Capacitor Android builds with Gradle and the Android SDK. No macOS required —
works on Windows, Linux (incl. WSL2), and macOS.

Requirements (verify against the Capacitor environment-setup docs for your version):
- **JDK** matching your Capacitor version — you normally don't install it separately
  (Android Studio bundles a compatible JDK). If setting `JAVA_HOME` manually, follow
  the Capacitor environment-setup docs (e.g. Capacitor 8 → JDK 17+)
- **Android SDK + platform-tools** — set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`),
  put `platform-tools` on PATH so `adb` works
- **Android Studio** (recent stable; it bundles a compatible JDK, SDK, emulator, and Gradle)

## One-time Setup

From repo root:

```bash
npm install @capacitor/core@latest
npm install -D @capacitor/cli@latest @capacitor/android@latest
```

If adding Android for the first time:

```bash
npm run build
npx cap add android
npx cap sync android
```

## Day-to-day Loop

```bash
npm run build
npx cap sync android
npx cap run android
```

Or open Android Studio:

```bash
npx cap open android
```

`cap sync` copies `dist/` into `android/app/src/main/assets/public/` and updates
native deps. `cap run` builds and installs on a connected device/emulator via Gradle.

## Device / Emulator

List targets:

```bash
npx cap run android --list
```

Run a specific target:

```bash
npx cap run android --target <DEVICE_ID>
```

- Physical device: enable **Developer options** + **USB debugging**, accept the
  RSA prompt. Confirm with `adb devices`.
- Emulator: create an AVD in Android Studio Device Manager with a recent
  system image (prefer **Google APIs** + hardware GL).

## Config Notes (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: 'com.example.app',     // becomes Gradle applicationId
  appName: 'My Three App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',     // default; assets served from https://localhost
  },
};
```

- `android.allowMixedContent: true` — only if you must load `http://` assets
- For live reload: set `server.url` to your dev machine IP:port and
  `server.cleartext: true`, run `npm run dev -- --host`, then `npx cap run android`.
  Remove `server.url` for production.

## Validation

```bash
npx cap doctor
```

Look for:
- matching `@capacitor/*` versions
- Android status healthy
- sync writing the native project correctly

## Signing a Release

Debug builds auto-sign with a debug key. Release builds need your own keystore.

```bash
keytool -genkey -v -keystore my-release.jks -keyalg RSA \
  -keysize 2048 -validity 10000 -alias my-app
```

Create `android/keystore.properties` (gitignore it):

```properties
storeFile=../my-release.jks
storePassword=****
keyAlias=my-app
keyPassword=****
```

Wire into `android/app/build.gradle`:

```gradle
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) { keystoreProps.load(new FileInputStream(keystoreFile)) }

android {
    signingConfigs {
        release {
            storeFile file(keystoreProps['storeFile'])
            storePassword keystoreProps['storePassword']
            keyAlias keystoreProps['keyAlias']
            keyPassword keystoreProps['keyPassword']
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.release }
    }
}
```

Build:

```bash
cd android
./gradlew bundleRelease    # -> app-release.aab (Play Store)
./gradlew assembleRelease  # -> app-release.apk (sideload)
```

Use official Android configuration docs as source of truth for permissions
(`android/app/src/main/AndroidManifest.xml`).
