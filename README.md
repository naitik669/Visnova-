

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Production URL

VisNova production: https://vis-nova-mx2l.vercel.app

Set this value in Vercel environment variables:

```env
VITE_APP_URL=https://vis-nova-mx2l.vercel.app
VITE_SUPABASE_URL=https://mmzlgntkhkeextqjaagi.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

## Auth Redirect Setup

Google OAuth must use Supabase's callback URL, not the Vercel app callback URL.

Add this in Google Cloud Console -> OAuth Client -> Authorized redirect URIs:

```text
https://mmzlgntkhkeextqjaagi.supabase.co/auth/v1/callback
```

Add these in Supabase -> Authentication -> URL Configuration -> Redirect URLs:

```text
https://vis-nova-mx2l.vercel.app/auth/callback
https://vis-nova-mx2l.vercel.app/onboarding
http://localhost:3000/auth/callback
http://localhost:3000/onboarding
```

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local`, then set `VITE_SUPABASE_ANON_KEY` and `GEMINI_API_KEY`
3. Run the app:
   `npm run dev`
