# VisNova Android Capacitor Build

VisNova uses Capacitor to package the existing React/Vite app as Android while keeping the web app as the source of truth.

## App Identity

- App name: `VisNova`
- Android package ID: `com.visnova.app`
- Capacitor web output: `dist`
- Mobile auth scheme: `visnova://auth/callback`
- Fallback package scheme: `com.visnova.app://auth/callback`

## Required Frontend Env

Only `VITE_` values are exposed to the app bundle.

```env
VITE_APP_URL=https://your-production-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_ENABLE_ANALYTICS=false
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

Never expose service-role keys, database passwords, SMTP passwords, or OAuth client secrets in Vite env vars.

## Supabase Redirect URLs

Add these in Supabase Authentication URL Configuration:

```text
https://your-production-domain.com/auth/callback
visnova://auth/callback
com.visnova.app://auth/callback
```

For Google OAuth, use the Supabase provider callback URL in Google Cloud, and keep the app redirect URL configured in Supabase.

## Build Commands

Use JDK 21 for local Android builds. Gradle/Capacitor Android currently compile with Java 21:

```powershell
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
```

```bash
npm run lint
npm run build
npm run cap:sync
npm run android:debug
npm run android:bundle
```

Debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Release AAB:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

The release AAB still needs a secure signing setup before upload to Google Play. Do not commit keystores or signing passwords.

## Android Permissions

Current permissions are intentionally minimal:

- `android.permission.INTERNET`

Add Camera, media, notifications, or storage permissions only when the native feature is implemented.

## Internal Test Checklist

- App launches with VisNova icon and splash.
- Login, signup, email verification, and OAuth callbacks return to the app.
- Dashboard, Feed, Vision details, Vision Board, Tasks, Growth, Circle, Notes, Journal, Settings, Cookie preferences, Feedback, and Logout work.
- Android back button behaves sensibly.
- No horizontal overflow or keyboard overlap on common Android phones.
- Offline/network errors show recoverable branded states.
- Privacy Policy, Terms, Cookie Policy, Contact/Feedback, and Data Rights pages are reachable.
