-- Cover foreign keys used by VisNova feed, notes, notifications, and social features.

create index if not exists idx_achievements_user_id on public.achievements(user_id);
create index if not exists idx_activities_user_id on public.activities(user_id);
create index if not exists idx_activities_vision_id on public.activities(vision_id);
create index if not exists idx_activities_note_id on public.activities(note_id);
create index if not exists idx_comments_user_id on public.comments(user_id);
create index if not exists idx_comments_parent_comment_id on public.comments(parent_comment_id);
create index if not exists idx_folders_parent_id on public.folders(parent_id);
create index if not exists idx_milestones_user_id on public.milestones(user_id);
create index if not exists idx_notes_linked_vision_id on public.notes(linked_vision_id);
create index if not exists idx_notifications_actor_id on public.notifications(actor_id);
create index if not exists idx_notifications_post_id on public.notifications(post_id);
create index if not exists idx_notifications_comment_id on public.notifications(comment_id);
create index if not exists idx_post_likes_user_id on public.post_likes(user_id);
create index if not exists idx_post_mentions_mentioned_user_id on public.post_mentions(mentioned_user_id);
create index if not exists idx_saved_posts_user_id on public.saved_posts(user_id);
create index if not exists idx_user_blocks_blocked_id on public.user_blocks(blocked_id);
create index if not exists idx_user_circles_circle_user_id on public.user_circles(circle_user_id);
create index if not exists idx_vision_shares_vision_id on public.vision_shares(vision_id);
create index if not exists idx_vision_shares_receiver_email on public.vision_shares(lower(receiver_email));
create index if not exists idx_vision_shares_sender_email on public.vision_shares(lower(sender_email));
create index if not exists idx_visions_user_email on public.visions(lower(user_email));
create index if not exists idx_todos_user_email on public.todos(lower(user_email));
