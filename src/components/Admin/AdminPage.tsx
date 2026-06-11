import { useEffect, useState } from 'react';
import { Flag, Inbox, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { safeFormat } from '../../lib/dateUtils';
import { SelectMenu } from '../ui/SelectMenu';
import { ClosedBetaFallback } from '../beta/ClosedBetaFallback';

const FEEDBACK_STATUSES = ['new', 'reviewing', 'planned', 'fixed', 'closed'] as const;
const REPORT_STATUSES = ['pending', 'reviewed', 'dismissed', 'action_taken'] as const;

type FeedbackRow = {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  category: string | null;
  priority: string | null;
  status: string;
  route: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  target_type: string | null;
  reason: string | null;
  details: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const { addToast } = useStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [feedbackRes, reportsRes] = await Promise.all([
      supabase
        .from('feedback_reports')
        .select('id,type,title,message,category,priority,status,route,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('reports')
        .select('id,target_type,reason,details,status,created_at')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);
    if (!feedbackRes.error) setFeedback((feedbackRes.data || []) as FeedbackRow[]);
    if (!reportsRes.error) setReports((reportsRes.data || []) as ReportRow[]);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.rpc('is_visnova_admin');
      if (!mounted) return;
      const allowed = !error && data === true;
      setIsAdmin(allowed);
      if (allowed) await loadData();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateFeedbackStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('feedback_reports').update({ status }).eq('id', id);
    if (error) {
      addToast({ type: 'error', title: 'Could not update feedback status.' });
      return;
    }
    setFeedback(items => items.map(item => (item.id === id ? { ...item, status } : item)));
  };

  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (error) {
      addToast({ type: 'error', title: 'Could not update report status.' });
      return;
    }
    setReports(items => items.map(item => (item.id === id ? { ...item, status } : item)));
  };

  if (isAdmin === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-text-secondary">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <ClosedBetaFallback
        title="This page is not available."
        description="The admin review area is restricted. If you reached this by accident, head back to your dashboard."
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-main">Beta review</h1>
            <p className="text-xs font-semibold text-text-secondary">Feedback and content reports from beta users.</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-card-border bg-card px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-text-main disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-2 text-text-main">
          <Inbox size={16} className="text-accent" />
          <h2 className="text-sm font-black uppercase tracking-widest">Feedback ({feedback.length})</h2>
        </div>
        <div className="mt-4 space-y-3">
          {feedback.length === 0 && (
            <p className="rounded-2xl border border-card-border bg-card p-5 text-sm font-semibold text-text-secondary">
              No feedback yet.
            </p>
          )}
          {feedback.map(item => (
            <div key={item.id} className="rounded-2xl border border-card-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">{item.type || 'feedback'}</span>
                    {item.priority && <span className="rounded-full bg-surface-muted px-2.5 py-1">{item.priority}</span>}
                    <span>{safeFormat(item.created_at, 'MMM d, yyyy')}</span>
                    {item.route && <span className="truncate">{item.route}</span>}
                  </div>
                  {item.title && <p className="mt-2 text-sm font-black text-text-main">{item.title}</p>}
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-text-secondary">
                    {item.message || 'No message.'}
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <SelectMenu
                    value={item.status}
                    options={FEEDBACK_STATUSES.map(status => ({ value: status, label: status }))}
                    onChange={(value: string) => updateFeedbackStatus(item.id, value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2 text-text-main">
          <Flag size={16} className="text-accent" />
          <h2 className="text-sm font-black uppercase tracking-widest">Content reports ({reports.length})</h2>
        </div>
        <div className="mt-4 space-y-3">
          {reports.length === 0 && (
            <p className="rounded-2xl border border-card-border bg-card p-5 text-sm font-semibold text-text-secondary">
              No reports yet.
            </p>
          )}
          {reports.map(item => (
            <div key={item.id} className="rounded-2xl border border-card-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    <span className="rounded-full bg-danger/10 px-2.5 py-1 text-danger">{item.reason || 'report'}</span>
                    {item.target_type && <span className="rounded-full bg-surface-muted px-2.5 py-1">{item.target_type}</span>}
                    <span>{safeFormat(item.created_at, 'MMM d, yyyy')}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-text-secondary">
                    {item.details || 'No details provided.'}
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <SelectMenu
                    value={item.status}
                    options={REPORT_STATUSES.map(status => ({ value: status, label: status.replace('_', ' ') }))}
                    onChange={(value: string) => updateReportStatus(item.id, value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
