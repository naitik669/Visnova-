-- Repair Vision Team RPCs by qualifying column references that can conflict
-- with RETURNS TABLE output variables or PL/pgSQL variables.

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
  FROM public.vision_team_invites AS i
  JOIN public.vision_teams AS t ON t.id = i.team_id
  WHERE i.invite_token = p_invite_token
  FOR UPDATE OF i;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'This invite link is invalid or expired';
  END IF;

  IF v_invite.is_revoked
    OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now())
    OR (v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses) THEN
    RAISE EXCEPTION 'This invite link is invalid or expired';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.vision_team_members AS m
    WHERE m.team_id = v_invite.team_id
      AND m.user_id = v_user
      AND m.status = 'active'
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
    UPDATE public.vision_team_invites AS i
    SET used_count = i.used_count + 1,
        updated_at = now()
    WHERE i.id = v_invite.id;

    INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary, metadata)
    VALUES (
      v_invite.team_id,
      v_user,
      'member_joined',
      'member',
      'A collaborator joined the Vision Team.',
      jsonb_build_object('role', v_invite.role)
    );
  END IF;

  RETURN QUERY
  SELECT
    v_invite.team_id::uuid,
    v_invite.vision_id::uuid,
    v_invite.role::text,
    v_already;
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
  SELECT i.team_id INTO v_team
  FROM public.vision_team_invites AS i
  WHERE i.id = p_invite_id;

  IF v_user IS NULL OR v_team IS NULL OR NOT app_private.can_manage_vision_team(v_team, v_user) THEN
    RAISE EXCEPTION 'You cannot revoke this invite';
  END IF;

  UPDATE public.vision_team_invites AS i
  SET is_revoked = true,
      updated_at = now()
  WHERE i.id = p_invite_id;

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

  SELECT m.role INTO v_target_role
  FROM public.vision_team_members AS m
  WHERE m.team_id = p_team_id
    AND m.user_id = p_member_user_id;

  IF v_user IS NULL OR NOT app_private.can_manage_vision_team(p_team_id, v_user) OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'You cannot change this member role';
  END IF;

  UPDATE public.vision_team_members AS m
  SET role = p_role,
      updated_at = now()
  WHERE m.team_id = p_team_id
    AND m.user_id = p_member_user_id
    AND m.role <> 'owner';

  INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary, metadata)
  VALUES (
    p_team_id,
    v_user,
    'role_changed',
    'member',
    'A collaborator role was updated.',
    jsonb_build_object('role', p_role)
  );

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
  SELECT m.role INTO v_target_role
  FROM public.vision_team_members AS m
  WHERE m.team_id = p_team_id
    AND m.user_id = p_member_user_id;

  IF v_user IS NULL OR NOT app_private.can_manage_vision_team(p_team_id, v_user) OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'You cannot remove this member';
  END IF;

  UPDATE public.vision_team_members AS m
  SET status = 'removed',
      updated_at = now()
  WHERE m.team_id = p_team_id
    AND m.user_id = p_member_user_id
    AND m.role <> 'owner';

  INSERT INTO public.vision_team_activity (team_id, actor_id, action_type, entity_type, summary)
  VALUES (p_team_id, v_user, 'member_removed', 'member', 'A collaborator was removed from the Vision Team.');

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_vision_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_vision_team_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vision_team_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_vision_team_member(uuid, uuid) TO authenticated;
