# BoxingTimerAppMobile

## Overview

BoxingTimerAppMobile started as an Angular web application.
It is now packaged as an Android app with Capacitor.

The Angular business logic still runs as a web app, but it is shipped inside a native Android app shell:
- Angular builds the production web bundle
- Capacitor copies that bundle into the Android project assets
- Gradle builds the Android APK from the native project

This is not a Kotlin rewrite of the app logic. It is a native Android wrapper around the Angular application.

## Deprecated Workflow

The previous APK workflow based on Bubblewrap, ngrok, `localhost`, and a hosted web origin is deprecated and must not be used.

The app no longer depends on:
- `localhost`
- `ngrok`
- Bubblewrap / TWA
- a remote web origin at runtime

## Development

Working directory:

```bash
C:\Workspace\BoxingTimerAppMobile
```

Start the Angular development server for browser-only development:

```bash
npm start
```

## Android Build Workflow

### 1. Build the Angular web app

Run from the project root:

```bash
cd C:\Workspace\BoxingTimerAppMobile
npm run build:web
```

This generates the production web bundle in:

```text
dist/boxing-timer-app/browser
```

### 2. Sync the Angular build into the Android project

Run from the project root:

```bash
cd C:\Workspace\BoxingTimerAppMobile
npx cap sync android
```

This copies the Angular production build into the Capacitor Android project assets.

### 3. Build the debug APK with Gradle

Run from the Android project directory:

```bash
cd C:\Workspace\BoxingTimerAppMobile\android
.\gradlew.bat assembleDebug
```

## Generated APK Location

After a successful debug build, the APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

From the repository root, the full path is:

```text
C:\Workspace\BoxingTimerAppMobile\android\app\build\outputs\apk\debug\app-debug.apk
```

## Optional Android Studio Workflow

Open the native Android project from the repository root:

```bash
cd C:\Workspace\BoxingTimerAppMobile
npm run android:open
```

## Summary

Supported packaging flow:
1. Build Angular with `npm run build:web`
2. Sync Capacitor with `npx cap sync android`
3. Build Android with `android\.\gradlew.bat assembleDebug`

This is the only supported Android APK workflow for this project.
