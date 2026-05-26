import { useEffect, useMemo, useState } from 'react';
import { Link as LinkIcon, Loader2, Shield, Users, X } from 'lucide-react';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import type { Vision, VisionTeamActivity, VisionTeamComment, VisionTeamInvite, VisionTeamMember, VisionTeamRole } from '../../types';
import { useStore } from '../../store/useStore';
import {
  addVisionTeamComment,
  buildVisionTeamInviteUrl,
  createVisionTeamInvite,
  ensureVisionTeam,
  fetchTeamBundle,
  fetchVisionTeamByVision,
  removeVisionTeamMember,
  revokeVisionTeamInvite,
  updateVisionTeamMemberRole
} from '../../lib/visionTeams';
import { RoleSelector } from './RoleSelector';
import { InviteLinkCard } from './InviteLinkCard';
import { TeamMembersPanel } from './TeamMembersPanel';
import { TeamActivityLog } from './TeamActivityLog';
import { TeamComments } from './TeamComments';
import { cn } from '../../lib/utils';

type Tab = 'invite' | 'members' | 'activity' | 'comments';

const expiryOptions = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: 'Never', value: 'never' }
];

export function ShareVisionModal({ isOpen, onClose, vision }: { isOpen: boolean; onClose: () => void; vision: Vision }) {
  const { addToast, session } = useStore();
  const [teamId, setTeamId] = useState<string | null>(vision.teamId || null);
  const [currentRole, setCurrentRole] = useState<VisionTeamRole | null>(vision.teamRole || null);
  const [selectedRole, setSelectedRole] = useState<Exclude<VisionTeamRole, 'owner'>>('viewer');
  const [expiry, setExpiry] = useState('7');
  const [activeTab, setActiveTab] = useState<Tab>('invite');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<VisionTeamMember[]>([]);
  const [invites, setInvites] = useState<VisionTeamInvite[]>([]);
  const [activity, setActivity] = useState<VisionTeamActivity[]>([]);
  const [comments, setComments] = useState<VisionTeamComment[]>([]);

  const canManage = currentRole === 'owner' || currentRole === 'admin' || (!vision.isShared && session?.user?.id);

  const loadBundle = async (id: string) => {
    setLoading(true);
    try {
      const bundle = await fetchTeamBundle(id);
      setMembers(bundle.members);
      setInvites(bundle.invites);
      setActivity(bundle.activity);
      setComments(bundle.comments);
      const mine = bundle.members.find(member => member.userId === session?.user?.id);
      setCurrentRole(mine?.role || (bundle.team?.ownerId === session?.user?.id ? 'owner' : vision.teamRole || null));
    } catch (error: any) {
      console.error('Failed to load Vision Team:', error);
      addToast({ type: 'error', title: 'Team unavailable', description: error.message || 'Could not load this Vision Team.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !vision.id) return;
    let cancelled = false;
    const setup = async () => {
      setLoading(true);
      try {
        let id = vision.teamId || null;
        if (!id) {
          const existing = await fetchVisionTeamByVision(vision.id);
          id = existing?.id || null;
        }
        if (!id && !vision.isShared) {
          id = await ensureVisionTeam(vision.id);
        }
        if (cancelled) return;
        setTeamId(id);
        if (id) await loadBundle(id);
      } catch (error: any) {
        console.error('Failed to prepare Vision Team:', error);
        addToast({ type: 'error', title: 'Share failed', description: error.message || 'Could not prepare collaboration.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void setup();
    return () => {
      cancelled = true;
    };
  }, [isOpen, vision.id]);

  const expiresAt = useMemo(() => {
    if (expiry === 'never') return null;
    const date = new Date();
    date.setDate(date.getDate() + Number(expiry));
    return date.toISOString();
  }, [expiry]);

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    addToast({ type: 'success', title: 'Link copied', description: 'Vision Team invite copied.' });
  };

  const createInvite = async () => {
    if (!teamId) return;
    setCreating(true);
    try {
      const invite = await createVisionTeamInvite(teamId, selectedRole, expiresAt);
      setInvites(prev => [invite, ...prev]);
      await copyUrl(buildVisionTeamInviteUrl(invite.inviteToken));
      addToast({ type: 'success', title: 'Invite ready', description: `${selectedRole} link created.` });
      void loadBundle(teamId);
    } catch (error: any) {
      console.error('Failed to create Vision Team invite:', error);
      addToast({ type: 'error', title: 'Invite failed', description: error.message || 'Could not create this invite link.' });
    } finally {
      setCreating(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      await revokeVisionTeamInvite(inviteId);
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
      addToast({ type: 'success', title: 'Invite revoked', description: 'This link can no longer be used.' });
      if (teamId) void loadBundle(teamId);
    } catch (error: any) {
      console.error('Failed to revoke Vision Team invite:', error);
      addToast({ type: 'error', title: 'Revoke failed', description: error.message || 'Could not revoke this invite.' });
    }
  };

  const changeMemberRole = async (member: VisionTeamMember, role: Exclude<VisionTeamRole, 'owner'>) => {
    if (!teamId) return;
    try {
      await updateVisionTeamMemberRole(teamId, member.userId, role);
      setMembers(prev => prev.map(item => item.id === member.id ? { ...item, role } : item));
      addToast({ type: 'success', title: 'Role updated', description: 'Collaborator permissions were updated.' });
    } catch (error: any) {
      console.error('Failed to update Vision Team role:', error);
      addToast({ type: 'error', title: 'Role failed', description: error.message || 'Could not update this role.' });
    }
  };

  const removeMember = async (member: VisionTeamMember) => {
    if (!teamId || !window.confirm('Remove this collaborator from the Vision Team?')) return;
    try {
      await removeVisionTeamMember(teamId, member.userId);
      setMembers(prev => prev.filter(item => item.id !== member.id));
      addToast({ type: 'success', title: 'Member removed', description: 'Collaborator access was removed.' });
    } catch (error: any) {
      console.error('Failed to remove Vision Team member:', error);
      addToast({ type: 'error', title: 'Remove failed', description: error.message || 'Could not remove this member.' });
    }
  };

  const submitComment = async (message: string) => {
    if (!teamId) return;
    try {
      const comment = await addVisionTeamComment(teamId, message);
      setComments(prev => [comment, ...prev]);
      addToast({ type: 'success', title: 'Comment posted', description: 'Team comment added.' });
    } catch (error: any) {
      console.error('Failed to add Vision Team comment:', error);
      addToast({ type: 'error', title: 'Comment failed', description: error.message || 'Could not add this comment.' });
    }
  };

  if (!isOpen) return null;

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="lg" className="bg-card" contentClassName="bg-card" zIndexClassName="z-[230]">
      <div className="border-b border-card-border p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Users size={23} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/70">Vision Team</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-text-main">Invite people to this Vision Board</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">
                Choose what people can do when they join {vision.title}.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-text-secondary hover:bg-bg-base hover:text-text-main" aria-label="Close collaboration modal">
            <X size={19} />
          </button>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {(['invite', 'members', 'activity', 'comments'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                activeTab === tab ? 'bg-accent text-accent-contrast' : 'bg-bg-base text-text-secondary hover:text-text-main'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-8 custom-scrollbar">
        {loading && (
          <div className="grid min-h-56 place-items-center text-text-secondary">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {!loading && activeTab === 'invite' && (
          <div className="space-y-6">
            {!canManage && (
              <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm font-bold text-warning">
                You can collaborate on this board, but only owners and admins can create invite links.
              </div>
            )}
            <RoleSelector value={selectedRole} onChange={setSelectedRole} />
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={expiry}
                onChange={event => setExpiry(event.target.value)}
                className="h-12 rounded-2xl border border-card-border bg-bg-base px-4 text-sm font-bold text-text-main outline-none"
                aria-label="Invite expiry"
              >
                {expiryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button
                type="button"
                onClick={createInvite}
                disabled={!canManage || !teamId || creating}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-50"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <LinkIcon size={15} />}
                Copy invite link
              </button>
            </div>
            <div className="space-y-3">
              {invites.map(invite => (
                <InviteLinkCard key={invite.id} invite={invite} onCopy={copyUrl} onRevoke={revokeInvite} />
              ))}
              {invites.length === 0 && (
                <div className="rounded-2xl border border-dashed border-card-border p-8 text-center text-sm font-bold text-text-secondary">
                  No active invite links yet.
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'members' && (
          <TeamMembersPanel members={members} currentRole={currentRole} onRoleChange={changeMemberRole} onRemove={removeMember} />
        )}

        {!loading && activeTab === 'activity' && <TeamActivityLog activity={activity} />}

        {!loading && activeTab === 'comments' && (
          <TeamComments comments={comments} role={currentRole} onSubmit={submitComment} />
        )}
      </div>

      <div className="flex items-start gap-3 border-t border-card-border bg-surface-muted p-6 text-[10px] font-bold leading-relaxed text-text-secondary">
        <Shield size={18} className="mt-0.5 shrink-0 text-accent" />
        Only content shared inside this Vision Team is accessible to collaborators. Your private notes, journals, logs, messages, and other Visions stay private.
      </div>
    </ResponsiveModal>
  );
}
