-- Notes/Journals trash retention.
-- Soft-deleted notes, journal entries, and audio notes stay in Trash for 7 days.

alter table if exists public.notes
  add column if not exists deleted_at timestamptz;

update public.notes
set deleted_at = coalesce(updated_at, created_at, now())
where is_deleted is true
  and deleted_at is null;

create index if not exists idx_notes_user_deleted_at
  on public.notes(user_id, deleted_at)
  where is_deleted is true;
