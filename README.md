

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Production URL

VisNova production: https://vis-nova-mx2l.vercel.app

Set this value in Vercel environment variables:

```env
VITE_APP_URL=https://vis-nova-mx2l.vercel.app
```

## Auth Redirect Setup

Google OAuth must use Supabase's callback URL, not the Vercel app callback URL.

Add this in Google Cloud Console -> OAuth Client -> Authorized redirect URIs:

```text
https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback
```

Add these in Supabase -> Authentication -> URL Configuration -> Redirect URLs:

```text
https://vis-nova-mx2l.vercel.app/auth/callback
https://vis-nova-mx2l.vercel.app/onboarding
```

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
