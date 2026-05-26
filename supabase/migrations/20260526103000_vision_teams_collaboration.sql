-- Vision Teams: scoped collaboration for Vision Boards.
-- Safe to run more than once; does not drop user data.

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE TABLE IF NOT EXISTS public.vision_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id uuid NOT NULL REFERENCES public.visions(id) ON DELETE CASCADE,
  board_id uuid NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vision_id)
);

CREATE TABLE IF NOT EXISTS public.vision_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.vision_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'active',
  invited_by uuid NULL REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id),
  CONSTRAINT vision_team_members_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  CONSTRAINT vision_team_members_status_check CHECK (status IN ('active', 'pending', 'removed'))
);

CREATE TABLE IF NOT EXISTS public.vision_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.vision_teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  invite_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  role text NOT NULL,
  expires_at timestamptz NULL,
  max_uses integer NULL,
  used_count integer NOT NULL DEFAULT 0,
  is_revoked boolean NOT NULL DEFAULT false,
  require_login boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vision_team_invites_role_check CHECK (role IN ('admin', 'editor', 'viewer')),
  CONSTRAINT vision_team_invites_max_uses_check CHECK (max_uses IS NULL OR max_uses > 0)
);

CREATE TABLE IF NOT EXISTS public.vision_team_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.vision_teams(id) ON DELETE CASCADE,
  actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_team_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.vision_teams(id) ON DELETE CASCADE,
  board_id uuid NULL,
  item_id text NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_teams_vision_id ON public.vision_teams(vision_id);
CREATE INDEX IF NOT EXISTS idx_vision_teams_owner_id ON public.vision_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_vision_team_members_team_user ON public.vision_team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_vision_team_members_user ON public.vision_team_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vision_team_invites_token ON public.vision_team_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_vision_team_invites_team ON public.vision_team_invites(team_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_vision_team_activity_team_created ON public.vision_team_activity(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vision_team_comments_team_created ON public.vision_team_comments(team_id, created_at DESC);

ALTER TABLE public.vision_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_team_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_team_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.vision_team_role(p_team_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.vision_team_members m
  WHERE m.team_id = p_team_id
    AND m.user_id = p_user_id
    AND m.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app_private.is_vision_team_member(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vision_team_members m
    WHERE m.team_id = p_team_id
      AND m.user_id = p_user_id
      AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_vision_team(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(app_private.vision_team_role(p_team_id, p_user_id) IN ('owner', 'admin'), false)
$$;

CREATE OR REPLACE FUNCTION app_private.can_edit_vision_team(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(app_private.vision_team_role(p_team_id, p_user_id) IN ('owner', 'admin', 'editor'), false)
$$;

CREATE OR REPLACE FUNCTION app_private.can_view_vision_id(p_vision_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visions v
    WHERE v.id = p_vision_id
      AND (
        v.user_id = p_user_id
        OR v.visibility = 'public'
        OR EXISTS (
          SELECT 1
          FROM public.vision_teams t
          JOIN public.vision_team_members m ON m.team_id = t.id
          WHERE t.vision_id = v.id
            AND m.user_id = p_user_id
            AND m.status = 'active'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION app_private.can_edit_vision_id(p_vision_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visions v
    WHERE v.id = p_vision_id
      AND (
        v.user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.vision_teams t
          WHERE t.vision_id = v.id
            AND app_private.can_edit_vision_team(t.id, p_user_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION app_private.prevent_vision_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Changing Vision ownership is not allowed from this action.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_vision_owner_change ON public.visions;
CREATE TRIGGER prevent_vision_owner_change
BEFORE UPDATE ON public.visions
FOR EACH ROW
EXECUTE FUNCTION app_private.prevent_vision_owner_change();

DROP POLICY IF EXISTS vision_teams_select_member ON public.vision_teams;
CREATE POLICY vision_teams_select_member
ON public.vision_teams
FOR SELECT
USING (owner_id = auth.uid() OR app_private.is_vision_team_member(id, auth.uid()));

DROP POLICY IF EXISTS vision_teams_insert_owner ON public.vision_teams;
CREATE POLICY vision_teams_insert_owner
ON public.vision_teams
FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS vision_teams_update_manager ON public.vision_teams;
CREATE POLICY vision_teams_update_manager
ON public.vision_teams
FOR UPDATE
USING (app_private.can_manage_vision_team(id, auth.uid()))
WITH CHECK (app_private.can_manage_vision_team(id, auth.uid()));

DROP POLICY IF EXISTS vision_teams_delete_owner ON public.vision_teams;
CREATE POLICY vision_teams_delete_owner
ON public.vision_teams
FOR DELETE
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS vision_team_members_select_team ON public.vision_team_members;
CREATE POLICY vision_team_members_select_team
ON public.vision_team_members
FOR SELECT
USING (user_id = auth.uid() OR app_private.is_vision_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_members_insert_manager ON public.vision_team_members;
CREATE POLICY vision_team_members_insert_manager
ON public.vision_team_members
FOR INSERT
WITH CHECK (user_id = auth.uid() OR app_private.can_manage_vision_team(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_members_update_manager ON public.vision_team_members;
CREATE POLICY vision_team_members_update_manager
ON public.vision_team_members
FOR UPDATE
USING (app_private.can_manage_vision_team(team_id, auth.uid()) AND role <> 'owner')
WITH CHECK (app_private.can_manage_vision_team(team_id, auth.uid()) AND role <> 'owner');

DROP POLICY IF EXISTS vision_team_members_delete_manager ON public.vision_team_members;
CREATE POLICY vision_team_members_delete_manager
ON public.vision_team_members
FOR DELETE
USING (app_private.can_manage_vision_team(team_id, auth.uid()) AND role <> 'owner');

DROP POLICY IF EXISTS vision_team_invites_select_manager ON public.vision_team_invites;
CREATE POLICY vision_team_invites_select_manager
ON public.vision_team_invites
FOR SELECT
USING (app_private.can_manage_vision_team(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_invites_insert_manager ON public.vision_team_invites;
CREATE POLICY vision_team_invites_insert_manager
ON public.vision_team_invites
FOR INSERT
WITH CHECK (created_by = auth.uid() AND app_private.can_manage_vision_team(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_invites_update_manager ON public.vision_team_invites;
CREATE POLICY vision_team_invites_update_manager
ON public.vision_team_invites
FOR UPDATE
USING (app_private.can_manage_vision_team(team_id, auth.uid()))
WITH CHECK (app_private.can_manage_vision_team(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_activity_select_member ON public.vision_team_activity;
CREATE POLICY vision_team_activity_select_member
ON public.vision_team_activity
FOR SELECT
USING (app_private.is_vision_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_activity_insert_member ON public.vision_team_activity;
CREATE POLICY vision_team_activity_insert_member
ON public.vision_team_activity
FOR INSERT
WITH CHECK (actor_id = auth.uid() AND app_private.is_vision_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_comments_select_member ON public.vision_team_comments;
CREATE POLICY vision_team_comments_select_member
ON public.vision_team_comments
FOR SELECT
USING (app_private.is_vision_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_comments_insert_member ON public.vision_team_comments;
CREATE POLICY vision_team_comments_insert_member
ON public.vision_team_comments
FOR INSERT
WITH CHECK (user_id = auth.uid() AND app_private.is_vision_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_comments_update_own_or_manager ON public.vision_team_comments;
CREATE POLICY vision_team_comments_update_own_or_manager
ON public.vision_team_comments
FOR UPDATE
USING (user_id = auth.uid() OR app_private.can_manage_vision_team(team_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR app_private.can_manage_vision_team(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_team_comments_delete_own_or_manager ON public.vision_team_comments;
CREATE POLICY vision_team_comments_delete_own_or_manager
ON public.vision_team_comments
FOR DELETE
USING (user_id = auth.uid() OR app_private.can_manage_vision_team(team_id, auth.uid()));

DROP POLICY IF EXISTS vision_teams_select_shared ON public.visions;
CREATE POLICY vision_teams_select_shared
ON public.visions
FOR SELECT
USING (app_private.can_view_vision_id(id, auth.uid()));

DROP POLICY IF EXISTS vision_teams_update_editors ON public.visions;
CREATE POLICY vision_teams_update_editors
ON public.visions
FOR UPDATE
USING (app_private.can_edit_vision_id(id, auth.uid()))
WITH CHECK (app_private.can_edit_vision_id(id, auth.uid()));

DROP POLICY IF EXISTS vision_team_tasks_select_shared ON public.tasks;
CREATE POLICY vision_team_tasks_select_shared
ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id
  OR (vision_id IS NOT NULL AND app_private.can_view_vision_id(vision_id, auth.uid()))
);

DROP POLICY IF EXISTS vision_team_tasks_insert_editor ON public.tasks;
CREATE POLICY vision_team_tasks_insert_editor
ON public.tasks
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND vision_id IS NOT NULL
  AND app_private.can_edit_vision_id(vision_id, auth.uid())
);

DROP POLICY IF EXISTS vision_team_tasks_update_editor ON public.tasks;
CREATE POLICY vision_team_tasks_update_editor
ON public.tasks
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (vision_id IS NOT NULL AND app_private.can_edit_vision_id(vision_id, auth.uid()))
)
WITH CHECK (
  auth.uid() = user_id
  OR (vision_id IS NOT NULL AND app_private.can_edit_vision_id(vision_id, auth.uid()))
);

DROP POLICY IF EXISTS vision_team_tasks_delete_editor ON public.tasks;
CREATE POLICY vision_team_tasks_delete_editor
ON public.tasks
FOR DELETE
USING (
  auth.uid() = user_id
  OR (vision_id IS NOT NULL AND app_private.can_edit_vision_id(vision_id, auth.uid()))
);

CREATE OR REPLACE FUNCTION public.create_vision_team_if_missing(p_vision_id uuid, p_board_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_title text;
  v_team_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  SELECT user_id, title INTO v_owner, v_title
  FROM public.visions
  WHERE id = p_vision_id;

  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'Only the Vision owner can create a Vision Team';
  END IF;

  SELECT id INTO v_team_id
  FROM public.vision_teams
  WHERE vision_id = p_vision_id
  LIMIT 1;

  IF v_team_id IS NULL THEN
    INSERT INTO public.vision_teams (vision_id, board_id, owner_id, name)
    VALUES (p_vision_id, p_board_id, v_user, COALESCE(NULLIF(v_title, ''), 'Vision Team'))
    RETURNING id INTO v_team_id;

    INSERT INTO public.vision_team_members (team_id, user_id, role, status, invited_by)
    VALUES (v_team_id, v_user, 'owner', 'active', v_user)
    ON CONFLICT (team_id, user_id)
    DO UPDATE SET role = 'owner', status = 'active', updated_at = now();

    INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, entity_id, summary)
    VALUES (v_team_id, v_user, 'team_created', 'vision', p_vision_id, 'Vision Team created.');
  END IF;

  RETURN v_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_vision_team_invite(
  p_team_id uuid,
  p_role text,
  p_expires_at timestamptz DEFAULT NULL,
  p_max_uses integer DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  invite_token text,
  role text,
  expires_at timestamptz,
  max_uses integer,
  used_count integer,
  is_revoked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;
  IF p_role NOT IN ('admin', 'editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid invite role';
  END IF;
  IF NOT app_private.can_manage_vision_team(p_team_id, v_user) THEN
    RAISE EXCEPTION 'You cannot create invites for this Vision Team';
  END IF;

  RETURN QUERY
  INSERT INTO public.vision_team_invites (team_id, created_by, role, expires_at, max_uses)
  VALUES (p_team_id, v_user, p_role, p_expires_at, p_max_uses)
  RETURNING vision_team_invites.id, vision_team_invites.invite_token, vision_team_invites.role,
    vision_team_invites.expires_at, vision_team_invites.max_uses, vision_team_invites.used_count,
    vision_team_invites.is_revoked;

  INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary, metadata)
  VALUES (p_team_id, v_user, 'invite_created', 'invite', 'Invite link created.', jsonb_build_object('role', p_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_vision_team_invite(p_invite_token text)
RETURNS TABLE (
  team_id uuid,
  vision_id uuid,
  vision_title text,
  inviter_name text,
  role text,
  expires_at timestamptz,
  is_valid boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.team_id,
    t.vision_id,
    t.name AS vision_title,
    COALESCE(p.display_name, p.full_name, 'A VisNova user') AS inviter_name,
    i.role,
    i.expires_at,
    (
      i.is_revoked = false
      AND (i.expires_at IS NULL OR i.expires_at > now())
      AND (i.max_uses IS NULL OR i.used_count < i.max_uses)
    ) AS is_valid,
    CASE
      WHEN i.id IS NULL THEN 'invalid'
      WHEN i.is_revoked THEN 'revoked'
      WHEN i.expires_at IS NOT NULL AND i.expires_at <= now() THEN 'expired'
      WHEN i.max_uses IS NOT NULL AND i.used_count >= i.max_uses THEN 'used_up'
      ELSE 'valid'
    END AS reason
  FROM public.vision_team_invites i
  JOIN public.vision_teams t ON t.id = i.team_id
  LEFT JOIN public.profiles p ON p.id = i.created_by
  WHERE i.invite_token = p_invite_token
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_vision_team(p_invite_token text)
RETURNS TABLE (
  team_id uuid,
  vision_id uuid,
  role text,
  already_member boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_invite record;
  v_already boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  SELECT i.*, t.vision_id INTO v_invite
  FROM public.vision_team_invites i
  JOIN public.vision_teams t ON t.id = i.team_id
  WHERE i.invite_token = p_invite_token
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'This invite link is invalid or expired';
  END IF;
  IF v_invite.is_revoked OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now())
    OR (v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses) THEN
    RAISE EXCEPTION 'This invite link is invalid or expired';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.vision_team_members
    WHERE team_id = v_invite.team_id
      AND user_id = v_user
      AND status = 'active'
  ) INTO v_already;

  INSERT INTO public.vision_team_members (team_id, user_id, role, status, invited_by)
  VALUES (v_invite.team_id, v_user, v_invite.role, 'active', v_invite.created_by)
  ON CONFLICT (team_id, user_id)
  DO UPDATE SET
    role = CASE
      WHEN public.vision_team_members.role = 'owner' THEN 'owner'
      ELSE EXCLUDED.role
    END,
    status = 'active',
    invited_by = EXCLUDED.invited_by,
    updated_at = now();

  IF NOT v_already THEN
    UPDATE public.vision_team_invites
    SET used_count = used_count + 1,
        updated_at = now()
    WHERE id = v_invite.id;

    INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary, metadata)
    VALUES (v_invite.team_id, v_user, 'member_joined', 'member', 'A collaborator joined the Vision Team.', jsonb_build_object('role', v_invite.role));
  END IF;

  RETURN QUERY SELECT v_invite.team_id, v_invite.vision_id, v_invite.role, v_already;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_vision_team_invite(p_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_team uuid;
BEGIN
  SELECT team_id INTO v_team FROM public.vision_team_invites WHERE id = p_invite_id;
  IF v_user IS NULL OR v_team IS NULL OR NOT app_private.can_manage_vision_team(v_team, v_user) THEN
    RAISE EXCEPTION 'You cannot revoke this invite';
  END IF;

  UPDATE public.vision_team_invites
  SET is_revoked = true, updated_at = now()
  WHERE id = p_invite_id;

  INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, entity_id, summary)
  VALUES (v_team, v_user, 'invite_revoked', 'invite', p_invite_id, 'Invite link revoked.');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_vision_team_member_role(p_team_id uuid, p_member_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_target_role text;
BEGIN
  IF p_role NOT IN ('admin', 'editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid member role';
  END IF;
  SELECT role INTO v_target_role
  FROM public.vision_team_members
  WHERE team_id = p_team_id AND user_id = p_member_user_id;

  IF v_user IS NULL OR NOT app_private.can_manage_vision_team(p_team_id, v_user) OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'You cannot change this member role';
  END IF;

  UPDATE public.vision_team_members
  SET role = p_role, updated_at = now()
  WHERE team_id = p_team_id AND user_id = p_member_user_id AND role <> 'owner';

  INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary, metadata)
  VALUES (p_team_id, v_user, 'role_changed', 'member', 'A collaborator role was updated.', jsonb_build_object('role', p_role));

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_vision_team_member(p_team_id uuid, p_member_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_target_role text;
BEGIN
  SELECT role INTO v_target_role
  FROM public.vision_team_members
  WHERE team_id = p_team_id AND user_id = p_member_user_id;

  IF v_user IS NULL OR NOT app_private.can_manage_vision_team(p_team_id, v_user) OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'You cannot remove this member';
  END IF;

  UPDATE public.vision_team_members
  SET status = 'removed', updated_at = now()
  WHERE team_id = p_team_id AND user_id = p_member_user_id AND role <> 'owner';

  INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary)
  VALUES (p_team_id, v_user, 'member_removed', 'member', 'A collaborator was removed from the Vision Team.');

  RETURN true;
END;
$$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_team_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_team_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_team_comments TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vision_team_if_missing(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vision_team_invite(uuid, text, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_vision_team_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_vision_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_vision_team_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vision_team_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_vision_team_member(uuid, uuid) TO authenticated;
