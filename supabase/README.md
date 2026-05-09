# VisNova Supabase Migrations

The files in `supabase/migrations` are the source of truth for the database.

Run migrations in filename order against the VisNova Supabase project. Do not use old root-level setup SQL files; they were removed because they were stale and conflicted with the current auth, onboarding, notes, social, and storage contracts.

New public tables need both RLS policies and explicit grants for authenticated client access. Keep new migrations safe for existing data by using `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and policy drops before creating replacements.

If the deployed app reports `Bucket not found` for avatars, post images, audio notes, or NovaCapsules, the live project has not applied the latest storage migrations yet. Run `supabase/urgent_apply_storage_buckets.sql` once in the Supabase SQL editor, then continue applying the normal migration chain.

If the Feedback page reports `Could not find the table 'public.feedback_reports' in the schema cache`, apply `supabase/migrations/20260509133000_feedback_reports.sql` to the live VisNova project. If the table was just created, reload the Supabase schema cache or wait briefly for PostgREST to refresh.

If archive/delete/restore post actions fail, run `supabase/urgent_apply_posts_archive.sql` once in the Supabase SQL editor. It creates the `archived`, `archived_at`, and `deleted_at` columns plus owner-only RLS policies used by the app.
