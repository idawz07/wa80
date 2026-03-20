# Converting a Static Web Project into a Private iPhone App

This document explains how to take another project similar to this one and wrap it as a private iPhone app using Capacitor.

This is for direct device install only. It is not written for App Store deployment.

## When this approach fits

Use this process if the other project is:

- A static web app or PWA
- Built from HTML, CSS, JavaScript, and local assets
- Intended to run offline on your own iPhone
- Not dependent on a backend server for core functionality

This approach is a good fit for checklist apps, guides, field tools, reference viewers, and other self-contained offline utilities.

## What the wrapper does

Capacitor creates a native iOS shell around the web app.

- Your existing web app stays the source of truth
- Capacitor copies the built web files into an iOS project
- Xcode installs that native shell on the iPhone
- The app then runs locally on the device without needing Safari

## Files to add to the new project

Add these files at the project root:

- `package.json`
- `capacitor.config.ts`
- `.gitignore`
- `scripts/sync-web-assets.ps1`

You will also generate:

- `app-web/`
- `ios/`
- `package-lock.json`

## Recommended structure

Keep the original web files in the repo root or wherever the project already expects them.

Use `app-web/` as the Capacitor staging folder. Copy the app into that folder before each `cap copy` or `cap sync`.

## Step 1: Add Node and Capacitor config

Create `package.json` like this and adjust names as needed:

```json
{
  "name": "my-ios-wrapper",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "sync:web": "powershell -ExecutionPolicy Bypass -File .\\scripts\\sync-web-assets.ps1",
    "cap:copy": "npm run sync:web && npx cap copy",
    "cap:sync": "npm run sync:web && npx cap sync",
    "cap:add:ios": "npm run sync:web && npx cap add ios",
    "cap:open:ios": "npx cap open ios"
  },
  "dependencies": {
    "@capacitor/core": "^7.2.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^7.2.0",
    "@capacitor/ios": "^7.2.0",
    "typescript": "^5.9.3"
  }
}
```

Create `capacitor.config.ts` like this:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.yourapp',
  appName: 'Your App Name',
  webDir: 'app-web',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always',
    scrollEnabled: true
  }
};

export default config;
```

Notes:

- `appId` must be unique on your machine and in Xcode signing
- `appName` is what shows on the iPhone home screen
- `webDir` should match the folder populated by your sync script

## Step 2: Add the asset sync script

Create `scripts/sync-web-assets.ps1`.

This script should:

- Delete the old `app-web/` folder
- Recreate `app-web/`
- Copy the web app files into it
- Copy icons and any static assets into it

Example:

```powershell
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'app-web'

if (Test-Path $target) {
  Remove-Item $target -Recurse -Force
}

New-Item -ItemType Directory -Path $target | Out-Null
New-Item -ItemType Directory -Path (Join-Path $target 'icons') | Out-Null

Copy-Item (Join-Path $root 'index.html') $target
Copy-Item (Join-Path $root 'manifest.webmanifest') $target
Copy-Item (Join-Path $root 'sw.js') $target
Copy-Item (Join-Path $root 'jszip.min.js') $target
Copy-Item (Join-Path $root 'icons\*') (Join-Path $target 'icons') -Recurse -Force
```

Adjust the copied files for the other project.

If the other app has a build step, make the script copy from its build output instead of the repo root.

## Step 3: Ignore generated folders

Create or update `.gitignore`:

```gitignore
node_modules/
app-web/
ios/App/App/public/
```

## Step 4: Guard browser-only behavior inside the native shell

Some browser features do not behave the same way inside an iPhone WebView. In this project, the main issue was service worker registration.

Add a helper like this near the main startup logic:

```js
function isNativeShell() {
  var cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function') {
    try {
      return !!cap.isNativePlatform();
    } catch (e) {}
  }
  return !!(window.webkit && window.webkit.messageHandlers);
}
```

Then gate the service worker:

```js
if ('serviceWorker' in navigator && !isNativeShell()) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
}
```

Why:

- Safari PWA mode and Capacitor are different runtime models
- The native app already ships the web assets locally
- Service workers are often unnecessary or problematic inside the native shell

## Step 5: Install dependencies and generate the iOS project

From the project root:

```powershell
npm install
npm run cap:add:ios
```

This generates the `ios/` folder and copies `app-web/` into the Xcode project.

After any web app change:

```powershell
npm run cap:sync
```

## Step 6: Add iPhone permission strings

If the app can:

- take photos
- choose photos
- save files or exported images

then update `ios/App/App/Info.plist`.

Typical entries:

```xml
<key>NSCameraUsageDescription</key>
<string>Use the camera to capture reference photos for this app.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save exported files or images to your device.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Select existing photos for use in this app.</string>
```

Without these, iOS may block the camera or photo picker.

## Step 7: Open in Xcode on a Mac

The actual iPhone install still requires macOS and Xcode.

On the Mac:

```powershell
npm install
npm run cap:sync
npx cap open ios
```

Then in Xcode:

1. Open the `App` target.
2. Go to `Signing & Capabilities`.
3. Choose your personal Apple ID team.
4. Change the bundle identifier if needed.
5. Connect the iPhone.
6. Select the iPhone as the run destination.
7. Build and run.

On the iPhone, you may need to trust your developer profile under:

`Settings > General > VPN & Device Management`

## Common issues

### Service worker conflicts

Symptom:

- Blank screen
- App not updating
- Inconsistent offline behavior

Fix:

- Disable service worker registration inside the native shell

### Browser-style downloads do not feel native

Symptom:

- ZIP export works poorly
- Download links do nothing useful
- `a.download` behavior is inconsistent

Fix:

- For a quick private build, you may accept the current browser behavior
- For a better result, replace export/download with Capacitor Share or Filesystem plugins later

### IndexedDB or localStorage concerns

For simple offline apps, both usually work inside Capacitor on iPhone.

Still test:

- app launch after force-close
- app launch with airplane mode enabled
- stored photos after relaunch
- exported files after relaunch

### CocoaPods warnings on Windows

That is expected.

- You can generate the `ios/` folder on Windows
- The native dependency install happens properly on the Mac with Xcode/CocoaPods available

## Minimal checklist for the next similar project

1. Add `package.json`
2. Add `capacitor.config.ts`
3. Add `scripts/sync-web-assets.ps1`
4. Add `.gitignore`
5. Copy web assets into `app-web/`
6. Disable service worker inside native shell
7. Run `npm install`
8. Run `npm run cap:add:ios`
9. Add `Info.plist` permission strings
10. On a Mac, open the iOS project in Xcode and install to device

## What to change for each new project

These values will vary every time:

- `appId`
- `appName`
- copied asset list in `sync-web-assets.ps1`
- camera/photo/export permissions
- any code paths that assume normal Safari or desktop browser behavior

## Recommendation

For projects like this, keep the web app simple and treat Capacitor as a thin packaging layer.

Do not rewrite the app into Swift unless the web runtime becomes the real limitation. For offline internal tools, the wrapper approach is faster and lower risk.
