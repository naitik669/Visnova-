import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Shield, Users, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { joinVisionTeam, validateVisionTeamInvite } from '../../lib/visionTeams';

type InvitePreview = {
  team_id: string;
  vision_id: string;
  vision_title: string;
  inviter_name: string;
  role: string;
  expires_at: string | null;
  is_valid: boolean;
  reason: string;
};

export default function JoinVisionTeamPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, addToast, fetchVisions } = useStore();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const result = await validateVisionTeamInvite(token);
        if (!cancelled) setPreview(result || null);
      } catch (error) {
        console.error('Failed to validate Vision Team invite:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const join = async () => {
    if (!token) return;
    if (!session?.user?.id) {
      addToast({ type: 'info', title: 'Login required', description: 'Sign in first, then open the invite link again.' });
      navigate('/', { replace: false });
      return;
    }
    setJoining(true);
    try {
      const result = await joinVisionTeam(token);
      await fetchVisions();
      addToast({
        type: 'success',
        title: result?.already_member ? 'Already in team' : 'Joined Vision Team',
        description: result?.already_member ? 'Opening the shared Vision Board.' : 'You can now collaborate on this Vision.'
      });
      navigate(`/visions?open=${result.vision_id}&team=${result.team_id}`, { replace: true });
    } catch (error: any) {
      console.error('Failed to join Vision Team:', error);
      const rawMessage = String(error?.message || '');
      const safeMessage = /ambiguous|column reference|schema cache|function/i.test(rawMessage)
        ? 'Could not join this Vision Team. Please refresh and try again.'
        : rawMessage || 'This invite link is invalid or expired.';
      addToast({ type: 'error', title: 'Join failed', description: safeMessage });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-base text-text-secondary">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const invalid = !preview || !preview.is_valid;

  return (
    <div className="min-h-screen bg-bg-base px-4 py-10 text-text-main">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
        <div className="w-full rounded-[2rem] border border-card-border bg-card p-8 shadow-2xl shadow-accent/10 sm:p-10">
          <div className="mb-7 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            {invalid ? <XCircle size={27} /> : <Users size={27} />}
          </div>

          {invalid ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-danger/80">Invite unavailable</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">This invite link is invalid or expired.</h1>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-text-secondary">
                Ask the Vision owner for a fresh collaboration link.
              </p>
              <button
                type="button"
                onClick={() => navigate('/visions')}
                className="mt-8 h-12 rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
              >
                Back to Visions
              </button>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80">Vision Team Invite</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">You’ve been invited to a Vision Team.</h1>
              <div className="mt-6 rounded-2xl border border-card-border bg-bg-base p-5">
                <p className="text-xs font-black uppercase tracking-widest text-text-secondary/50">Vision Board</p>
                <p className="mt-1 text-xl font-black">{preview.vision_title}</p>
                <p className="mt-3 text-sm font-bold text-text-secondary">Role: <span className="text-accent">{preview.role}</span></p>
                <p className="text-sm font-bold text-text-secondary">Invited by: {preview.inviter_name}</p>
              </div>
              <div className="mt-6 flex gap-3 rounded-2xl border border-accent/15 bg-accent/5 p-4 text-xs font-bold leading-relaxed text-text-secondary">
                <Shield size={17} className="mt-0.5 shrink-0 text-accent" />
                Collaborators can only access content shared inside this Vision Team. Your private notes, journals, logs, messages, and other Visions stay private.
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={join}
                  disabled={joining}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-60"
                >
                  {joining && <Loader2 size={15} className="animate-spin" />}
                  Join Team
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/visions')}
                  className="h-12 rounded-2xl border border-card-border px-6 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
