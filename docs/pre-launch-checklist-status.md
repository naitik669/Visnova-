# VisNova Pre-Launch Checklist Status

Legend:
- `[x]` done in repo or migrations
- `[ ]` still blank / not verified
- `<mark>OWNER</mark>` requires founder/legal/admin/manual work outside this repo

## Legal & Compliance

- [x] Privacy Policy page added
- [x] Terms of Service page added
- [x] Cookie Policy / Cookie notice added if tracking cookies are used
- [x] Contact email visible for legal/support requests
- [x] Age/user eligibility mentioned if needed
- [x] User-generated content rules added
- [x] Content removal/reporting process added
- [x] Data deletion request process added
- [x] Account deletion option or support request path added
- [x] Public/private content behavior clearly explained
- [x] YouTube embed usage follows YouTube embed/API rules in policy copy
- [x] Notes, journals, audio notes, and private data are clearly described as private by default
- [ ] <mark>OWNER</mark> Legal review of Privacy Policy / Terms / Cookie Policy
- [x] Temporary beta contact email set to `naitik.business69@gmail.com`

## Auth & Account Security

- [x] Logout fully clears session and app state
- [x] Auth callback route works in code
- [x] Invalid/expired auth links show a clean error
- [x] Onboarding starts correctly after signup in code path
- [x] Returning users do not see onboarding flash in code path
- [x] Protected pages cannot be accessed while logged out
- [x] Profile row is created automatically after signup
- [x] Username uniqueness works
- [x] Avatar upload works in code/storage contract
- [x] Rate limiting added for auth attempts: max 5 attempts per 15 minutes
- [x] No sensitive keys exposed in frontend
- [x] Supabase RLS policies checked in migrations
- [x] Storage upload paths are user-scoped
- [x] Private buckets use signed URLs
- [ ] <mark>OWNER</mark> Signup flow manually tested
- [ ] <mark>OWNER</mark> Login flow manually tested
- [ ] <mark>OWNER</mark> Email verification link manually tested
- [ ] <mark>OWNER</mark> Password reset flow manually tested
- [ ] <mark>OWNER</mark> Google OAuth manually tested
- [ ] <mark>OWNER</mark> Supabase dashboard Auth rate limits configured

## Core Product Functionality

- [x] Dashboard loads real user data
- [x] Create/Edit/Delete Vision code paths exist
- [x] Add/complete task code paths exist
- [x] Vision progress updates in store
- [x] Vision Board opens
- [x] Vision Board dotted canvas works
- [x] Vision Board text/image/shape/checklist tools work
- [x] Vision Board saves and reloads through `visions.elements`
- [x] Library opens correctly
- [x] Normal notes create/edit/delete code paths exist
- [x] Audio notes record, save, and replay in code path
- [x] Audio notes are playable from the card
- [x] Journal saves by selected date
- [x] Journal writing mode is centered and comfortable
- [x] Feed posting/image/status paths exist
- [x] Like/comment/save works in store code
- [x] Archive/restore/delete post code paths exist
- [x] View Profile opens correct user route
- [x] Follow/unfollow works in store code
- [x] Circle uses follows graph
- [x] Communities load from Supabase tables
- [x] Community threads/messages enabled
- [x] Growth Learning Session enabled
- [x] Nova Clock / NovaCapsules enabled
- [ ] <mark>OWNER</mark> Full product flow manually tested on live database

## UI / UX Readiness

- [x] Popups fit on mobile screens in updated major components
- [x] Modals become mobile sheets/full-screen where updated
- [x] Bottom navigation does not cover primary app content
- [x] Sidebar collapsed state works
- [x] Focus/thunder icon does not disappear
- [x] Profile does not disappear in collapsed sidebar
- [x] Duplicate Profile nav removed
- [x] Sidebar logo contrast fixed
- [x] Library note cards are compact
- [x] Empty/loading/saving states exist in major modules
- [x] Error boundary added
- [ ] <mark>OWNER</mark> Mobile layout manually tested at 375px, 390px, 430px, 768px
- [ ] <mark>OWNER</mark> Keyboard-safe form testing on real mobile
- [ ] <mark>OWNER</mark> No horizontal scroll verified on real devices
- [ ] <mark>OWNER</mark> No major console errors verified in browser

## Performance & Stability

- [x] Feed uses limits
- [x] Comment thread pagination/limits exist
- [x] Vision Board saves are debounced
- [x] Growth/Learning Session saves are debounced
- [x] No unnecessary full-page reloads found in source
- [x] 404 page exists
- [x] Error boundary added
- [ ] <mark>OWNER</mark> `npm run build` in CI/Vercel verified
- [ ] <mark>OWNER</mark> `npm run lint` in CI/Vercel verified
- [ ] <mark>OWNER</mark> Main bundle size reviewed
- [ ] Heavy modules lazy-loaded where possible
- [ ] <mark>OWNER</mark> App refresh tested on every main route

## Analytics & Tracking

- [ ] <mark>OWNER</mark> Choose analytics provider and privacy settings
- [ ] Page tracking added
- [ ] User event tracking added
- [ ] Signup event tracked
- [ ] Onboarding completion tracked
- [ ] Vision created event tracked
- [ ] Task completed event tracked
- [ ] Note created event tracked
- [ ] Journal entry created tracked
- [ ] Post created tracked
- [ ] Follow/comment events tracked
- [ ] Day 1 / Day 7 retention tracked
- [ ] Analytics does not expose private user content
- [x] Cookie notice added for future analytics-cookie disclosure

## SEO & Marketing Basics

- [x] App title updated
- [x] Meta description added
- [x] Open Graph image added
- [x] Favicon added
- [x] Basic social preview tags added
- [x] `robots.txt` added
- [x] `sitemap.xml` added
- [ ] <mark>OWNER</mark> Submit site to Google Search Console
- [ ] <mark>OWNER</mark> Submit sitemap after production URL confirmation
- [ ] <mark>OWNER</mark> Landing page copy reviewed
- [ ] Public pages have clean URLs
- [ ] Public profile / Vision showcase pages planned or added
- [ ] <mark>OWNER</mark> Demo video prepared
- [ ] <mark>OWNER</mark> Product screenshots prepared
- [ ] <mark>OWNER</mark> X.com / LinkedIn launch post prepared

## Feedback Loop

- [x] Support/contact email added
- [x] Bug report option added
- [x] Feedback form added
- [x] In-app Feedback button added
- [x] Feedback database table migration added
- [x] User can report broken post/profile/content via Feedback or post report
- [ ] <mark>OWNER</mark> Beta Discord/WhatsApp group created
- [ ] <mark>OWNER</mark> Admin review workflow for feedback reports
- [ ] <mark>OWNER</mark> Beta testers told where to send feedback

## Security Audit

- [x] Full codebase scanned for hardcoded keys
- [x] No private API keys in frontend
- [x] `.env` files ignored
- [x] `.env.example` uses placeholders only
- [x] Supabase service role key not exposed
- [x] Gemini/OpenAI/API keys not exposed in Vite bundle
- [x] Inputs sanitized
- [x] Oversized payloads rejected
- [x] File uploads validated by type and size
- [x] Unsafe URLs rejected
- [x] RLS checked in migrations
- [x] Auth rate limits added in code/migration
- [x] Abuse limits planned or added
- [x] Private audio notes protected
- [x] Private NovaCapsules protected
- [x] Archived/deleted posts not publicly visible
- [ ] <mark>OWNER</mark> Live Supabase advisors/RLS tests run after migrations

## Closed Beta Launch Criteria

- [x] Open other user profile works correctly in route code
- [x] Logout works in store code
- [ ] <mark>OWNER</mark> 2 test accounts used for full manual testing
- [ ] <mark>OWNER</mark> User A cannot access User B private data verified live
- [ ] <mark>OWNER</mark> User A can follow/comment on User B public content verified live
- [ ] <mark>OWNER</mark> Signup to onboarding to dashboard verified live
- [ ] <mark>OWNER</mark> Create Vision to complete task verified live
- [ ] <mark>OWNER</mark> Notes/audio/journal persistence verified live
- [ ] <mark>OWNER</mark> Post engagement and archive/delete verified live
- [ ] <mark>OWNER</mark> Mobile core flow verified
- [ ] <mark>OWNER</mark> 20-50 beta users ready to invite
- [ ] <mark>OWNER</mark> 7-day beta plan prepared
- [ ] <mark>OWNER</mark> Metrics dashboard prepared

## Beta Metrics To Track

- [ ] <mark>OWNER</mark> Signups
- [ ] <mark>OWNER</mark> Onboarding completion rate
- [ ] <mark>OWNER</mark> DAU / WAU
- [ ] <mark>OWNER</mark> Day 1 / Day 7 retention
- [ ] <mark>OWNER</mark> Visions created
- [ ] <mark>OWNER</mark> Tasks completed
- [ ] <mark>OWNER</mark> Notes and journals created
- [ ] <mark>OWNER</mark> Posts/comments/follows created
- [ ] <mark>OWNER</mark> Audio notes created
- [ ] <mark>OWNER</mark> Users who return 3+ days per week
