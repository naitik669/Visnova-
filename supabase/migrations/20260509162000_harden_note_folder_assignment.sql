-- Ensure notes can only be assigned to folders owned by the same user.

drop policy if exists notes_insert_own on public.notes;
create policy notes_insert_own
on public.notes
for insert
with check (
  auth.uid() = user_id
  and (
    folder_id is null
    or exists (
      select 1
      from public.folders
      where folders.id = notes.folder_id
        and folders.user_id = auth.uid()
    )
  )
);

drop policy if exists notes_update_own on public.notes;
create policy notes_update_own
on public.notes
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    folder_id is null
    or exists (
      select 1
      from public.folders
      where folders.id = notes.folder_id
        and folders.user_id = auth.uid()
    )
  )
);
