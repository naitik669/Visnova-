# Supabase Auth Redirect Setup

VisNova expects all email auth links and OAuth callbacks to return through the app route:

```text
/auth/callback
```

In the Supabase dashboard, configure:

- Site URL: the production VisNova URL, for example `https://visnova.vercel.app`
- Redirect URLs:
  - `https://visnova.vercel.app/auth/callback`
  - `https://visnova-naitik669s-projects.vercel.app/auth/callback`
  - `https://visnova-git-main-naitik669s-projects.vercel.app/auth/callback`
  - `http://localhost:5173/auth/callback`
  - any active Vercel preview deployment domain ending in `/auth/callback`

For Google OAuth in Google Cloud, the authorized redirect URI should be the Supabase provider callback URL from the Supabase Auth provider settings, not the app callback route directly.

For this Supabase project, Google Cloud should use:

```text
https://mmzlgntkhkeextqjaagi.supabase.co/auth/v1/callback
```

Do not open that Supabase callback URL directly in the browser. Start OAuth only from VisNova's "Continue with Google" button so Supabase can generate and verify the OAuth `state` parameter.

If a confirmation or magic link opens the app but no session is created, request a new link. Expired or invalid links are handled in-app with a clear error message.
