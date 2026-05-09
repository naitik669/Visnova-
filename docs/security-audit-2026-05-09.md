# VisNova Security Audit - 2026-05-09

## 1. Executive Summary

VisNova is safer for closed beta after this pass. Private AI env exposure was removed from the Vite bundle, `.env.example` is placeholder-only, dead Firebase lint wiring was removed, file uploads now share stricter MIME/size validation, auth forms have a 5 attempts / 15 minutes browser limiter, and a Supabase migration adds a `rate_limits` table, `check_rate_limit` RPC, storage contracts, and database payload constraints.

Supabase references used:
- [Supabase Product Security](https://supabase.com/docs/guides/security/product-security)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Production Checklist / Auth Rate Limits](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Final posture: safe for closed beta with warnings, once the migration is applied and Supabase dashboard Auth rate limits are configured.

## 2. Critical Findings

Critical: private AI key exposure path existed in `vite.config.ts`.
Impact: `process.env.GEMINI_API_KEY` was defined into the frontend bundle if present locally or in Vercel.
Fix: removed the Vite define. Private AI keys must stay server-side only.

High: `.env.example` contained concrete deployment URLs.
Impact: public URLs are not private secrets, but examples should not encode project-specific config.
Fix: changed `.env.example` to placeholders only.

High: auth attempts had no local UX limiter.
Impact: users could spam login/signup/reset/resend actions from the UI.
Fix: added 5 attempts / 15 minutes browser limiter for login, signup, password reset, resend confirmation, and Google sign-in.

Medium: user payload limits were inconsistent.
Impact: oversized posts/comments/notes/boards could reach Supabase if UI validation was bypassed.
Fix: added shared validation utilities and DB CHECK constraints for major payloads.

## 3. Secrets Audit

Scanned:
- `src/`
- `public/` if present
- `scripts/` if present
- `supabase/`
- migrations
- docs
- root config files
- `.env.example`
- package scripts
- Vercel config
- hidden files excluding `.git/` and `node_modules/`

Patterns included:
`apikey`, `api_key`, `secret`, `password`, `token`, `bearer`, `authorization`, `service_role`, `DATABASE_URL`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SMTP`, `PRIVATE_KEY`, `sk-`, `AIza`, `eyJ`, `postgres://`, `supabase.co`, and Firebase references.

Findings:
- No private service role key, OpenAI key, Gemini key, Google client secret, database URL, SMTP credential, bearer token, private key, or JWT-like token remains in the repo scan.
- A public Supabase project URL was present in `supabase/urgent_apply_storage_buckets.sql`; removed it from the comment.
- Dead Firebase ESLint config existed with no package dependency; removed it.

Rotation:
- No private secret was found in current files, so no specific key rotation is required from this scan.
- If real secrets were ever committed before this audit, rotate them because Git history may still contain them.

## 4. Auth Security

Implemented:
- Browser limiter: 5 attempts / 15 minutes per normalized email for login, signup, password reset, and resend confirmation.
- Browser limiter: 5 attempts / 15 minutes for Google sign-in per browser.
- Browser limiter keys hash identifiers before writing to localStorage.
- Auth resend now uses `supabase.auth.resend({ type: 'signup' })` rather than password reset as a verification resend.
- Removed normal-flow console logs around onboarding/auth state.

Required dashboard setup:
- Configure Supabase Authentication > Rate Limits to enforce auth limits server-side.
- Site URL and redirect URLs must include production and local `/auth/callback`.

Remaining issue:
- Client-side auth rate limiting is bypassable. Supabase dashboard rate limits must be treated as the enforcement layer.

## 5. Input Validation

Added `src/lib/security.ts` with:
- `sanitizeText`
- `sanitizePlainText`
- `validateUsername`
- `validateDisplayName`
- `validatePostPayload`
- `validateCommentPayload`
- `validateNotePayload`
- `validateVisionPayload`
- `validateVisionElements`
- `validateYouTubeUrl`
- `validateFile`
- `isSafeUrl`
- `checkClientRateLimit`

Validated modules in this pass:
- Profile updates
- Posts
- Post updates
- Comments
- Notes
- Vision updates and Vision Board elements
- Growth resource creation/update
- YouTube imports
- Timestamp notes/action points
- Uploads

Database constraints added for:
- profile username/display name/bio
- post caption/content
- comments
- notes
- visions/elements
- growth resources, timestamp notes, action points
- NovaCapsules
- community threads/messages

## 6. Storage Security

Frontend upload validation now enforces MIME and size limits for:
- avatars: PNG/JPEG/WebP, 5MB
- post images: PNG/JPEG/WebP, 10MB
- note audio: WebM/MP3/MP4/M4A/WAV/OGG, 25MB
- NovaCapsule images: PNG/JPEG/WebP, 10MB
- Vision Board images: PNG/JPEG/WebP, 10MB

Migration enforces bucket contracts:
- `avatars`: public read, user-scoped writes
- `post-images`: public read, user-scoped writes
- `note-audio`: private, user-scoped signed access
- `nova-capsules`: private, user-scoped signed access
- `vision-board-images`: public read, user-scoped writes

## 7. RLS Audit

Migration adds:
- RLS-enabled `rate_limits`
- scoped rate limit policies
- storage policies for insert/update/delete own folder
- public read only for intentionally public media buckets
- authenticated owner read for private note audio and NovaCapsules

Existing project still needs live Supabase verification for every table:
- `profiles`
- `visions`
- `tasks`
- `todos`
- `notes`
- `folders`
- `posts`
- `post_media`
- `post_tags`
- `post_mentions`
- `post_likes`
- `saved_posts`
- `comments`
- `follows`
- `notifications`
- `communities`
- `community_members`
- `community_threads`
- `community_thread_messages`
- `messages` / `conversations`
- `growth_resources`
- `growth_resource_notes`
- `growth_action_points`
- `nova_capsules`
- `nova_capsule_items`
- `activities`
- `user_interests`
- `user_circles`
- `blocked_users`

Remaining issue:
- I could not run live Supabase advisors or RLS tests from this environment. Apply migrations, then run Supabase advisors and table-specific RLS tests in the dashboard/CLI.

## 8. Frontend Exposure

Fixed:
- Removed `process.env.GEMINI_API_KEY` frontend define.
- `.env.example` now only includes client-safe Vite placeholders:
  - `VITE_APP_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- No private key patterns remain in the current file scan.
- Removed normal `console.log` auth/profile traces.
- No `dangerouslySetInnerHTML`, raw `innerHTML`, or normal-flow `console.log` patterns remain in `src/`.

## 9. Abuse Protection

Client limits added:
- auth: 5 / 15 minutes
- Google auth: 5 / 15 minutes
- posts: 20 / hour
- comments: 60 / hour
- follow/unfollow: 50 / hour
- profile updates: 10 / hour
- username changes: 3 / day
- note creation: 120 / hour
- Growth resource creation/import: 50 / day

Backend support added:
- `rate_limits` table
- `check_rate_limit(identifier, action, max_attempts, window_minutes)` RPC
- RPC hashes identifiers before storage, so emails are not stored in plain text by the rate-limit table.

Remaining issue:
- Most writes still go directly from frontend to Supabase tables. For hard enforcement, route high-abuse writes through RPCs or Edge Functions that call `check_rate_limit` before insert/update.

## 10. Remaining Vulnerabilities

High: direct table writes can bypass client rate limits.
Fix: move post/comment/follow/community/message writes behind RPCs or Edge Functions that enforce `check_rate_limit`.

High: live RLS posture not verified from this environment.
Fix: run Supabase advisors and authenticated/anonymous policy tests after applying migrations.

Medium: public media buckets are intentionally public.
Fix: keep avatars/post images public if product expects sharing; make Vision Board images private if boards contain sensitive private planning.

Medium: console errors still print technical Supabase errors.
Fix: acceptable for beta debugging, but gate verbose logging behind development mode before wider launch.

Low: no dependency audit could be run locally.
Fix: run `npm audit` in CI or a machine with npm.

## 11. Closed Beta Security Checklist

Pass: no private secrets found in current files.
Pass: `.env` files are ignored.
Pass: `.env.example` uses placeholders only.
Pass: private AI env exposure removed from Vite config.
Pass: upload MIME and size validation added.
Pass: input validation helpers added.
Pass: auth browser limiter added.
Pass: Supabase rate limit migration added.
Pass: storage bucket contracts/policies added.
Pass: no raw HTML rendering patterns found.
Warning: live Supabase RLS/advisors not run here.
Warning: npm lint/build unavailable in this environment.
Warning: true anti-abuse enforcement requires RPC/Edge Function routing for sensitive writes.

## 12. Final Recommendation

VisNova is safe for closed beta with warnings after applying `20260509120000_security_hardening_closed_beta.sql` and configuring Supabase Auth rate limits in the dashboard.

Do not widen launch until:
- Supabase advisors pass
- RLS tests pass for anonymous/User A/User B
- high-abuse writes use server-side rate enforcement
- CI runs `npm run lint`, `npm run build`, and dependency audit
