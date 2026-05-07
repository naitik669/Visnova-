# VisNova Supabase Migrations

The files in `supabase/migrations` are the source of truth for the database.

Run migrations in filename order against the VisNova Supabase project. Do not use old root-level setup SQL files; they were removed because they were stale and conflicted with the current auth, onboarding, notes, social, and storage contracts.

New public tables need both RLS policies and explicit grants for authenticated client access. Keep new migrations safe for existing data by using `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and policy drops before creating replacements.
