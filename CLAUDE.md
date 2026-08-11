# CLAUDE.md — AppGate (React Native)

Personal-use Android app that intercepts launches of user-selected apps and either **blocks them for a set duration** or **shows a custom message before letting the user through**.

Single user (the developer). Sideloaded via APK, never published to Play Store. Optimise for reliability and simplicity, not Play policy compliance, iOS parity, or scale.

**Android only.** Do not write any iOS code, do not create an `ios/` implementation, do not add iOS entries to the TurboModule spec.

---

## 1. Hard constraints

- **No server, no backend, no network.** Zero network calls. No analytics, accounts, cloud sync, or crash reporting.
- **No SQL database.** No Room, no SQLite, no WatermelonDB, no Realm.
- **JavaScript owns the data.** React state is the source of truth while the app is open. It is mirrored to one JSON file so the native service can read it. See §4.
- **State must survive process death and reboot.**
- Must produce an **installable release APK**. See §13.
- **The developer's PC cannot run Android Studio or an emulator.** All APK builds happen on GitHub Actions; all testing happens on a physical phone. Do not generate emulator instructions, AVD configs, or anything that assumes a local Android SDK beyond `adb`. See §13.

---

## 2. The RN / native split — read this first

React Native has no API for any part of the enforcement path. The following are **100% Kotlin** and cannot be done in JS:

| Concern | Where it lives |
|---|---|
| Foreground app detection | Kotlin — `AccessibilityService` |
| Blocking overlay | Kotlin — `WindowManager` + XML layout |
| Permission state checks + Settings deep links | Kotlin — TurboModule methods |
| Installed app list + icons | Kotlin — `PackageManager` |
| Config file the service reads | Kotlin — TurboModule writes it |
| **App list UI, add flow, edit sheet, setup screen** | **React Native** |

Everything else in this document assumes that split. Do not attempt to move detection or the overlay into JS.

### The overlay must not be React Native
Rendering the block screen as an RN view is technically possible and practically wrong here:

1. It requires a live `ReactHost` / `ReactSurface`. When the app is backgrounded the host may be torn down, and in bridgeless mode there is no global bridge object a native service can reach to get one back.
2. Even when it works, spinning up a React surface takes hundreds of milliseconds. During that window the user is looking at Instagram. A native XML overlay inflates in single-digit milliseconds.

Build the overlay as an XML layout inflated with `LayoutInflater`. It is two `TextView`s and two `Button`s.

---

## 3. Core behaviour

Each app in the list is in exactly one **mode**:

| Mode | Behaviour on launch |
|---|---|
| `BLOCK` | Full-screen overlay. No way in. Only action is "Go home". Expires at a stored timestamp. |
| `MESSAGE` | Full-screen overlay with the user's custom text. Two actions: "Go back" and "Continue anyway". |

Worked examples, taken directly from the user:

- Instagram → `BLOCK`, duration 3 hours. Set at 14:00, so it is unopenable until 17:00.
- Zomato → `MESSAGE`, text `"you have to reduce your weight, get over your taste addiction"`. Shown every time before entry; the user can still proceed.

### 3.1 Block expiry
Blocks are stored as an absolute epoch millisecond value, `blockUntilMillis`, computed once in JS when the user picks the duration. **There is no timer, alarm, countdown, `AlarmManager`, `WorkManager`, or `setTimeout` anywhere in this app.** On every detection event, Kotlin compares `System.currentTimeMillis()` against the stored value.

This is the most important design decision in the app: nothing to keep alive, nothing to reschedule after reboot, zero battery cost. Do not replace it with a scheduled job.

When a block expires, the entry stays in the list showing "Expired" and the app opens freely. One tap re-arms it.

### 3.2 Grace period (critical, easy to miss)
When a `MESSAGE` user taps "Continue anyway", Kotlin records `graceUntil[packageName] = now + 5 minutes` in memory. While in grace, do not re-trigger the overlay for that package.

Without this, the overlay reappears on every window transition inside the app and the app becomes unusable. This is the single most likely bug in the build.

Grace is deliberately **in-memory, native-side only**. It never crosses to JS and is never persisted.

---

## 4. Storage — the "frontend only" decision

**JS holds the list in React state. On every mutation, JS calls `AppGate.saveConfig(json)`. Kotlin writes that string to `filesDir/appgate_config.json` and simultaneously refreshes a `@Volatile` in-memory cache the accessibility service reads.**

That is the entire persistence layer. No AsyncStorage, no MMKV, no SQLite, no second store.

```
React state  ──saveConfig(json)──►  TurboModule
                                        ├──► filesDir/appgate_config.json   (durable)
                                        └──► AppGateConfigCache (static, @Volatile)
                                                    ▲ read on every launch event
                                             AccessibilityService
```

On app start, JS calls `AppGate.loadConfig()` once and hydrates React state from it.

### Why not pure in-memory JS state
The user's instinct was to hold everything in memory. That fails here for a specific reason: the accessibility service runs even when the RN app is closed, and the JS runtime does not exist at that point. Beyond that, the process is killed on reboot, on force-stop, and by OEM battery managers (§11 trap 3). A 3-hour block that vanishes when you restart your phone is worse than no block, because the bypass is trivial and gets learned within a day.

This design still keeps JS as the owner. The file is a mirror the native side reads, not a database with its own logic.

### Why not AsyncStorage or MMKV
Both are readable from Kotlin in principle, but both require reverse-engineering a storage path or instance ID that the library owns and can change between versions. One plain file that our own code writes is deterministic and has no library risk.

### Reactivity — "changes must reflect"
`saveConfig` updates the cache **synchronously before returning**. There is no file watching, no polling, no service restart. Edit an entry in the UI, and the next app launch uses the new value.

The service also reads the file once in `onServiceConnected` to populate the cache after a reboot, when JS has never run.

---

## 5. Tech stack

- React Native **0.86+**, CLI. Not Expo Go — it cannot load custom native code. Expo with prebuild plus a local module works, but adds a config-plugin layer for no benefit here.
- New Architecture is **mandatory, not a choice**. RN 0.82 removed the legacy bridge and `newArchEnabled=false` is now ignored. The native module must be a **TurboModule** with a TypeScript spec and Codegen.
- TypeScript throughout the JS side.
- Kotlin for the native module, accessibility service, and overlay.
- `minSdkVersion = 26`, `targetSdkVersion = 36`.
- Navigation: React Navigation, or plain component state. Three screens does not justify a router — use state unless it gets awkward.

---

## 6. TurboModule spec

`specs/NativeAppGate.ts`:

```ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface InstalledApp {
  packageName: string;
  appName: string;
  iconUri: string;   // file:// URI, see below
}

export interface Spec extends TurboModule {
  // config
  loadConfig(): string;                 // JSON string, "[]" if absent
  saveConfig(json: string): void;       // writes file + refreshes native cache

  // permissions
  isAccessibilityEnabled(): boolean;
  canDrawOverlays(): boolean;
  openAccessibilitySettings(): void;
  openOverlaySettings(): void;
  openBatteryOptimizationSettings(): void;
  openAppInfoSettings(): void;          // for the restricted-settings fix, trap 6

  // apps
  getInstalledApps(): Promise<InstalledApp[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAppGate');
```

`loadConfig` and `saveConfig` are synchronous — they are small, and JSI makes sync calls cheap. `getInstalledApps` is async because it touches `PackageManager` for ~150 entries.

### Icons — do not base64 them
Encoding 150 icon bitmaps and passing them over JSI will stall the UI. Instead, on the Kotlin side write each icon as a PNG into `cacheDir/icons/<packageName>.png` and return `file:///...` URIs. React Native's `<Image>` renders those directly. Write each file only if it does not already exist.

---

## 7. Data model

```ts
type Mode = 'BLOCK' | 'MESSAGE';

interface GatedApp {
  packageName: string;        // identity / key
  appName: string;            // cached label
  mode: Mode;
  blockUntilMillis?: number;  // BLOCK only
  message?: string;           // MESSAGE only
  createdAt: number;
}
```

Serialised as a `GatedApp[]` JSON array. Kotlin parses the same shape with `kotlinx.serialization`, or `org.json` — which is fine for something this small and avoids adding a plugin.

Icons are never stored in the config. Resolve them from `packageName` at render time.

---

## 8. CRUD contract

All of these live in a single `useGatedApps()` hook. Every one is read-modify-write on the whole array, followed by one `saveConfig` call.

| Operation | Behaviour |
|---|---|
| `add(app)` | Append. If `packageName` exists, replace it — never duplicate. |
| `update(app)` | Replace the entry with the matching `packageName`. |
| `remove(packageName)` | Drop the entry. Takes effect immediately, including on an active block. |
| `rearm(packageName, durationMs)` | Set `blockUntilMillis = Date.now() + durationMs`. |
| `switchMode(packageName, mode)` | Change mode; clear the field belonging to the other mode. |

Rules:
- Every mutation is `setState(next)` **and** `AppGate.saveConfig(JSON.stringify(next))`. Never one without the other.
- Derive the next array from the previous state functionally. Do not mutate in place — a stale closure will silently write an old list over a newer one.
- All of these must be reachable from the UI. Nothing hardcoded or settable only at first run.

---

## 9. Screens

### 9.1 Setup gate
Shown until all permissions are held. Re-check on `AppState` change to `active`, because the user grants these by leaving the app.

1. **Accessibility service** — `isAccessibilityEnabled()`; button calls `openAccessibilitySettings()`.
2. **Display over other apps** — `canDrawOverlays()`; button calls `openOverlaySettings()`.
3. **Battery optimisation** (informational) — `openBatteryOptimizationSettings()`, plus a note about OEM autostart settings.
4. **Restricted settings** (informational) — explain what to do if the accessibility toggle is greyed out, with a button calling `openAppInfoSettings()`. See §11 trap 6.

### 9.2 Home
- `FlatList` of gated apps: icon, app name, mode badge, live status line.
- Status text:
  - `BLOCK`, active → `Blocked · 2h 14m left`
  - `BLOCK`, expired → `Expired` + a "Re-arm" affordance
  - `MESSAGE` → `Message on open`
- Tap a row → edit sheet: change mode, change duration, edit message, Remove.
- FAB → add flow.
- Empty state with a one-line explanation.

Recompute countdown text on `AppState` resume, or with a 30-second interval. Do not build a second-accurate countdown; it is visual noise and re-renders the list needlessly.

### 9.3 Add flow
1. **App picker** — searchable `FlatList` from `getInstalledApps()`. Exclude our own package and anything already in the list. Sort by `appName`. Call it once and cache in state; it is not cheap.
2. **Mode choice** — two large cards: "Block completely" / "Show me a message".
3. **Configure**
   - `BLOCK`: duration chips `1h`, `3h`, `4h`, `8h`, `Until tomorrow 6am`, plus a custom picker. Store `Date.now() + duration`.
   - `MESSAGE`: multiline `TextInput`, ~200 character limit, with a live preview styled to match the real overlay.
4. Save → back to Home.

---

## 10. Native implementation notes

### 10.1 Detection
`AccessibilityService` declared in `AndroidManifest.xml`, configured with:

```xml
android:accessibilityEventTypes="typeWindowStateChanged"
android:accessibilityFeedbackType="feedbackGeneric"
android:canRetrieveWindowContent="false"
android:notificationTimeout="100"
```

In `onAccessibilityEvent`:

1. Ignore if `event.packageName` is null, equals our own package, or equals `com.android.systemui` — the notification shade and status bar fire these constantly.
2. Track `lastForegroundPackage`. Act only on a **transition into** a watched package, not on every event fired while already inside it.
3. Look up the package in `AppGateConfigCache`. If absent, return.
4. `BLOCK` and `now < blockUntilMillis` → show block overlay.
5. `MESSAGE` and `now > (graceUntil[pkg] ?: 0)` → show message overlay.

Do **not** use `UsageStatsManager` polling, or any `react-native-usage-stats` style package, as an alternative or fallback. It is laggier, less reliable, and burns battery.

### 10.2 Enforcement
`TYPE_APPLICATION_OVERLAY` window via `WindowManager`:

- `MATCH_PARENT` × `MATCH_PARENT`
- Flags: `FLAG_LAYOUT_IN_SCREEN` + `FLAG_LAYOUT_NO_LIMITS`
- Do **not** set `FLAG_NOT_TOUCHABLE` or `FLAG_NOT_FOCUSABLE`. The overlay must swallow all touches and receive key events.
- Consume `KEYCODE_BACK` via `setOnKeyListener` on the root view, so back does not dismiss into the app underneath.
- Fully opaque background. The app underneath must not be visible or readable.

Actions:
- "Go home" / "Go back" → `performGlobalAction(GLOBAL_ACTION_HOME)`, then remove the overlay.
- "Continue anyway" → set grace timestamp, then remove the overlay.

Hold the overlay in a single nullable field. Always remove any existing overlay before adding a new one — leaking overlay views is the most common crash source in apps like this.

### 10.3 Process rule
Do **not** declare `android:process` on the accessibility service. It must run in the app's default process so the static config cache is shared with the TurboModule.

There is deliberately **no foreground service**. An enabled `AccessibilityService` is restarted by the system after boot automatically, and adding an FGS on Android 15+ drags in the "must already have a visible overlay window before starting an FGS from the background" restriction for no benefit.

---

## 11. Known traps

**1. A debug APK will not run standalone.** React Native debug builds load the JS bundle from a Metro dev server. Put `app-debug.apk` on a phone with no Metro running and it shows a red screen. **For a downloadable APK, always build release.** See §13.

**2. Never start an `Activity` from the accessibility service** to show the block screen. Apps targeting Android 15+ no longer receive implicit background-activity-launch privileges, and a blocked launch throws **no exception and returns nothing** — it produces only a `"Background activity launch blocked!"` line in Logcat. Silent failure, painful to diagnose. The overlay approach sidesteps it entirely.

**3. OEM process killers.** On Xiaomi/MIUI, Vivo/Funtouch, Oppo/ColorOS, and Realme, the accessibility service will be killed despite being system-bound, unless autostart is enabled and battery optimisation is disabled — manually, per device. Check dontkillmyapp.com for the target device before assuming a bug is in the code.

**4. Package visibility on Android 11+.** Declare in the manifest, or `queryIntentActivities` returns almost nothing:
```xml
<queries>
    <intent>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent>
</queries>
```
Use this rather than `QUERY_ALL_PACKAGES`.

**5. Overlays cannot draw over the system Settings app** on most Android versions. That is a platform security guarantee, not a bug. It means the app can never stop the user walking into Settings and disabling the accessibility service. See §14.

**6. Android 13+ blocks accessibility for sideloaded apps.** After installing the APK, the accessibility toggle may appear greyed out behind a "Restricted setting" dialog. Fix: Settings → Apps → AppGate → ⋮ overflow → **Allow restricted settings**, then enable accessibility. `adb install` sometimes avoids this; tapping the APK file usually does not. Surface this in the setup gate — without it the app looks completely broken on first run.

**7. Codegen runs at build time.** After editing `specs/NativeAppGate.ts`, a plain `./gradlew assembleRelease` may reuse stale generated bindings. If the module resolves as undefined in JS after a spec change, clean first: `cd android && ./gradlew clean`.

**8. Do not `runBlocking` or do file I/O in `onAccessibilityEvent`.** It runs on the main thread, on the hot path of every window change. Read the in-memory cache only.

---

## 12. Build order

Do not attempt this in one pass. Verify each step on a real device before moving on.

**Verification is always: CI builds a release APK → download → install on the physical phone → check Logcat.** There is no emulator and no local Gradle. Set up the workflow in §13 as part of step 1, before there is anything to build — a broken CI pipeline discovered at step 10 is far more expensive than at step 1.

1. **Skeleton + CI** — `npx @react-native-community/cli init AppGate`, TypeScript, Home screen rendering a hardcoded array, **plus the GitHub Actions workflow and keystore secrets from §13**. *Verify: a green Actions run produces a downloadable APK that installs and opens on the phone.*
2. **TurboModule stub** — spec file, Codegen wired, Kotlin module returning hardcoded values for `loadConfig` / `canDrawOverlays`. *Verify: JS can call it and gets real values back.* This is the step most likely to fail on config, so isolate it.
3. **Config round-trip** — `saveConfig` / `loadConfig` against the real file. *Verify: add an entry, force-stop the app, reopen, entry is still there.*
4. **App picker** — `getInstalledApps()` with file-URI icons, full CRUD in the UI. *Verify: list scrolls smoothly with icons.*
5. **Accessibility service, log-only** — register it, log every foreground package transition. *Verify via Logcat that opening Instagram logs exactly one event, not a stream.*
6. **Overlay, hardcoded** — dummy overlay for one hardcoded package. *Verify it swallows touches, consumes back, and "Go home" works.*
7. **Wire the cache** — `saveConfig` refreshes the cache, service reads it, both modes driven by real data. *Verify: edit an entry in the UI and the next launch uses the new value, with no restart.*
8. **Grace period + expiry** — *Verify "Continue anyway" does not loop, and an expired block lets you through.*
9. **Setup gate + polish.**
10. **Release APK** — §13.

---

## 13. Producing the APK — build on CI, not locally

The developer's machine cannot run Android Studio or an emulator. **The APK is built by GitHub Actions and downloaded as an artifact.** Nothing in the toolchain — JDK, Android SDK, Gradle, Node — needs to exist on the local PC except `adb`.

### 13.1 Local machine needs only
- A text editor and `git`
- **`adb`** from Android platform-tools (~50 MB standalone download, does not require the SDK) for installing the APK and reading Logcat
- Optionally Node, if you want to run type-checking or lint locally. Not required to build.

Do not instruct the developer to run `./gradlew` locally. If a Gradle command must be described, mark it clearly as "runs on CI".

### 13.2 Keystore
Generate once, anywhere with a JDK — including inside a throwaway Actions run if no local JDK exists:

```bash
keytool -genkey -v -keystore appgate.keystore -alias appgate \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Never commit the keystore.** Base64-encode it and store it as a repository secret:

```bash
base64 -w 0 appgate.keystore > keystore.b64
```

Repository secrets required:
- `KEYSTORE_BASE64` — contents of `keystore.b64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS` — `appgate`
- `KEY_PASSWORD`

Add `*.keystore`, `*.b64`, and `android/gradle.properties` to `.gitignore`.

In `android/app/build.gradle`, the `signingConfigs.release` block reads these from environment variables, falling back gracefully so the file is committable.

### 13.3 Workflow

`.github/workflows/build.yml` — triggered on push to `main` and on `workflow_dispatch` so builds can be started manually from the browser:

```yaml
name: Build APK
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - uses: android-actions/setup-android@v3

      - uses: gradle/actions/setup-gradle@v4

      - run: npm ci

      - name: Decode keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/appgate.keystore

      - name: Build release APK
        working-directory: android
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: ./gradlew assembleRelease --no-daemon

      - uses: actions/upload-artifact@v4
        with:
          name: appgate-apk
          path: android/app/build/outputs/apk/release/app-release.apk
          retention-days: 30
```

Download the APK from the run's **Artifacts** section in the browser, transfer it to the phone, install.

Notes:
- `--no-daemon` — the daemon is pointless in a fresh container and just consumes memory.
- Runners have ~16 GB RAM, so RN's Gradle + Metro + Hermes peak is a non-issue there.
- Public repos get unmetered free minutes. Private repos on the Free plan get 2,000 Linux minutes/month; a build of this size runs roughly 5–8 minutes, so the limit is not reachable in practice.
- Enable Gradle caching (`gradle/actions/setup-gradle` does this) or every build re-downloads dependencies.

### 13.4 Build the release variant, always
`assembleRelease` bundles the JS and Hermes bytecode into the APK, so it runs with no Metro server. A debug APK will not run on the phone at all — see §11 trap 1. There is no reason to ever produce one here.

**Do not run `bundleRelease`.** That produces an `.aab` App Bundle for Play Store distribution, which cannot be sideloaded.

Leave `enableProguardInReleaseBuilds = false` for the first working build. R8 stripping a TurboModule entry point or the accessibility service produces confusing runtime failures. Enable it later with keep rules if size matters.

### 13.5 Install and debug on the phone
```bash
adb install -r app-release.apk
adb logcat -s AppGate:D
```
Or transfer the APK and tap it, having enabled "Install unknown apps" for the file manager. Then handle §11 trap 6.

Every native `Log` call in this project uses the tag `AppGate`, so the single Logcat filter above shows everything relevant. This is the only debugging channel available for the accessibility service — use it liberally in steps 5–8 of §12.

---

## 14. Explicitly out of scope for v1

Listed so they are not half-built. Do not implement unless asked.

- **iOS.** Android only.
- **Anti-bypass.** As specified, the app takes roughly 20 seconds to defeat: Settings → Accessibility → toggle off. If it turns out the app does not change behaviour, this is why, and the v2 fix is a mandatory cooldown before an entry can be edited or removed, plus a `DeviceAdminReceiver` so uninstall requires deactivating admin first. Ship v1 and find out whether it is needed.
- **Message rotation.** A single fixed string per app habituates within days; a rotating pool per app, plus occasional variation in the interaction itself (typed confirmation, forced 15-second wait), holds up considerably better. Changing `message?: string` to `messages?: string[]` later is trivial given the JSON storage — but ship the single string first.
- Scheduled or recurring blocks, usage statistics, widgets, notifications, backup/export, multi-device sync.