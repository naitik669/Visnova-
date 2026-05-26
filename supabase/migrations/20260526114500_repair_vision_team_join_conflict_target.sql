-- Repair join_vision_team conflict target ambiguity caused by RETURNS TABLE
-- output variables named team_id/user_id-like columns.

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
  ON CONFLICT ON CONSTRAINT vision_team_members_team_id_user_id_key
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

GRANT EXECUTE ON FUNCTION public.join_vision_team(text) TO authenticated;
