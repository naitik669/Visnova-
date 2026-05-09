# Supabase Auth Redirect Setup

VisNova expects all email auth links and OAuth callbacks to return through the app route:

```text
/auth/callback
```

In the Supabase dashboard, configure:

- Site URL: the production VisNova URL, for example `https://visnova.vercel.app`
- Redirect URLs:
  - `https://visnova.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`
  - any active Vercel preview domain ending in `/auth/callback`

For Google OAuth in Google Cloud, the authorized redirect URI should be the Supabase provider callback URL from the Supabase Auth provider settings, not the app callback route directly.

If a confirmation or magic link opens the app but no session is created, request a new link. Expired or invalid links are handled in-app with a clear error message.
