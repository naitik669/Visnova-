import { supabase } from './supabase';
import type {
  VisionTeam,
  VisionTeamActivity,
  VisionTeamComment,
  VisionTeamInvite,
  VisionTeamMember,
  VisionTeamRole
} from '../types';

export const visionTeamsEnabled = import.meta.env.VITE_ENABLE_VISION_TEAMS !== 'false';
export const teamCommentsEnabled = import.meta.env.VITE_ENABLE_TEAM_COMMENTS !== 'false';
export const teamActivityEnabled = import.meta.env.VITE_ENABLE_TEAM_ACTIVITY !== 'false';

export const canEditBoard = (role?: VisionTeamRole | null) => role === 'owner' || role === 'admin' || role === 'editor';
export const canManageMembers = (role?: VisionTeamRole | null) => role === 'owner' || role === 'admin';
export const canInvite = canManageMembers;
export const canComment = (role?: VisionTeamRole | null) => !!role && role !== 'viewer' ? true : true;

const toTeam = (row: any): VisionTeam => ({
  id: row.id,
  visionId: row.vision_id,
  boardId: row.board_id || null,
  ownerId: row.owner_id,
  name: row.name,
  description: row.description || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const toMember = (row: any): VisionTeamMember => ({
  id: row.id,
  teamId: row.team_id,
  userId: row.user_id,
  role: row.role,
  status: row.status,
  invitedBy: row.invited_by || null,
  joinedAt: row.joined_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  profile: row.profiles ? {
    displayName: row.profiles.display_name || null,
    fullName: row.profiles.full_name || null,
    username: row.profiles.username || null,
    avatarUrl: row.profiles.avatar_url || null,
    verified: row.profiles.verified || false
  } : undefined
});

const toInvite = (row: any): VisionTeamInvite => ({
  id: row.id,
  teamId: row.team_id,
  inviteToken: row.invite_token,
  role: row.role,
  expiresAt: row.expires_at || null,
  maxUses: row.max_uses || null,
  usedCount: row.used_count || 0,
  isRevoked: !!row.is_revoked,
  requireLogin: row.require_login !== false,
  createdAt: row.created_at
});

const toActivity = (row: any): VisionTeamActivity => ({
  id: row.id,
  teamId: row.team_id,
  actorId: row.actor_id || null,
  actionType: row.action_type,
  entityType: row.entity_type || null,
  entityId: row.entity_id || null,
  summary: row.summary,
  metadata: row.metadata || {},
  createdAt: row.created_at
});

const toComment = (row: any): VisionTeamComment => ({
  id: row.id,
  teamId: row.team_id,
  boardId: row.board_id || null,
  itemId: row.item_id || null,
  userId: row.user_id,
  message: row.message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: row.profiles ? {
    name: row.profiles.display_name || row.profiles.full_name || 'Collaborator',
    username: row.profiles.username || null,
    avatar: row.profiles.avatar_url || null,
    verified: row.profiles.verified || false
  } : undefined
});

async function fetchProfilesByIds(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, any>();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, username, avatar_url, verified')
    .in('id', ids);

  if (error) {
    console.error('Failed to load Vision Team profiles:', error);
    return new Map<string, any>();
  }

  return new Map((data || []).map((profile: any) => [profile.id, profile]));
}

export async function ensureVisionTeam(visionId: string) {
  const { data, error } = await supabase.rpc('create_vision_team_if_missing', {
    p_vision_id: visionId,
    p_board_id: null
  });
  if (error) throw error;
  return data as string;
}

export async function fetchVisionTeamByVision(visionId: string) {
  const { data, error } = await supabase
    .from('vision_teams')
    .select('*')
    .eq('vision_id', visionId)
    .maybeSingle();
  if (error) throw error;
  return data ? toTeam(data) : null;
}

export async function fetchTeamBundle(teamId: string) {
  const [teamResult, membersResult, invitesResult, activityResult, commentsResult] = await Promise.all([
    supabase.from('vision_teams').select('*').eq('id', teamId).maybeSingle(),
    supabase.from('vision_team_members').select('*').eq('team_id', teamId).eq('status', 'active').order('joined_at', { ascending: true }),
    supabase.from('vision_team_invites').select('*').eq('team_id', teamId).eq('is_revoked', false).order('created_at', { ascending: false }),
    supabase.from('vision_team_activity').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(20),
    supabase.from('vision_team_comments').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(50)
  ]);

  if (teamResult.error) throw teamResult.error;
  if (membersResult.error) throw membersResult.error;
  if (invitesResult.error) throw invitesResult.error;
  if (activityResult.error) throw activityResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const profileMap = await fetchProfilesByIds([
    ...(membersResult.data || []).map((member: any) => member.user_id),
    ...(commentsResult.data || []).map((comment: any) => comment.user_id)
  ]);

  return {
    team: teamResult.data ? toTeam(teamResult.data) : null,
    members: (membersResult.data || []).map((member: any) => toMember({ ...member, profiles: profileMap.get(member.user_id) })),
    invites: (invitesResult.data || []).map(toInvite),
    activity: (activityResult.data || []).map(toActivity),
    comments: (commentsResult.data || []).map((comment: any) => toComment({ ...comment, profiles: profileMap.get(comment.user_id) }))
  };
}

export async function createVisionTeamInvite(teamId: string, role: Exclude<VisionTeamRole, 'owner'>, expiresAt?: string | null, maxUses?: number | null) {
  const { data, error } = await supabase.rpc('create_vision_team_invite', {
    p_team_id: teamId,
    p_role: role,
    p_expires_at: expiresAt || null,
    p_max_uses: maxUses || null
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return toInvite({ ...row, team_id: teamId, require_login: true, created_at: new Date().toISOString() });
}

export async function validateVisionTeamInvite(token: string) {
  const { data, error } = await supabase.rpc('validate_vision_team_invite', { p_invite_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function joinVisionTeam(token: string) {
  const { data, error } = await supabase.rpc('join_vision_team', { p_invite_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function revokeVisionTeamInvite(inviteId: string) {
  const { error } = await supabase.rpc('revoke_vision_team_invite', { p_invite_id: inviteId });
  if (error) throw error;
  return true;
}

export async function updateVisionTeamMemberRole(teamId: string, userId: string, role: Exclude<VisionTeamRole, 'owner'>) {
  const { error } = await supabase.rpc('update_vision_team_member_role', {
    p_team_id: teamId,
    p_member_user_id: userId,
    p_role: role
  });
  if (error) throw error;
  return true;
}

export async function removeVisionTeamMember(teamId: string, userId: string) {
  const { error } = await supabase.rpc('remove_vision_team_member', {
    p_team_id: teamId,
    p_member_user_id: userId
  });
  if (error) throw error;
  return true;
}

export async function addVisionTeamComment(teamId: string, message: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Login required');

  const { data, error } = await supabase
    .from('vision_team_comments')
    .insert({
      team_id: teamId,
      user_id: user.id,
      message: message.trim()
    })
    .select('*')
    .single();
  if (error) throw error;
  const profileMap = await fetchProfilesByIds([user.id]);
  return toComment({ ...data, profiles: profileMap.get(user.id) });
}

export async function recordVisionTeamActivity(teamId: string, summary: string, actionType = 'board_updated', metadata: Record<string, any> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('vision_team_activity').insert({
    team_id: teamId,
    actor_id: user.id,
    action_type: actionType,
    entity_type: 'board',
    summary,
    metadata
  });
  if (error) {
    console.error('Failed to record Vision Team activity:', error);
    return false;
  }
  return true;
}

export function buildVisionTeamInviteUrl(token: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/join/vision-team/${token}`;
}
