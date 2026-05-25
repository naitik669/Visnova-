import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackBetaEvent } from '../../lib/betaAnalytics';
import { sanitizePlainText, sanitizeText } from '../../lib/security';
import { useStore } from '../../store/useStore';
import { SelectMenu } from '../ui/SelectMenu';

const supportEmail = 'naitik.business69@gmail.com';
const REPORT_TYPES = ['feedback', 'bug', 'feature_request', 'general'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

type ReportType = typeof REPORT_TYPES[number];
type ReportPriority = typeof PRIORITIES[number];

type EmailDeliveryState = 'sent' | 'not_configured' | 'failed';

function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getFeedbackContext() {
  if (typeof window === 'undefined') {
    return {
      route: '',
      pageUrl: '',
      userAgent: '',
      device: 'unknown',
      submittedAt: new Date().toISOString(),
      viewport: { width: 0, height: 0 }
    };
  }

  return {
    route: window.location.pathname + window.location.search,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    device: getDeviceType(),
    submittedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

async function sendFeedbackEmail(reportId: string, accessToken: string): Promise<EmailDeliveryState> {
  try {
    const response = await fetch('/api/send-feedback', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reportId })
    });

    if (response.ok) return 'sent';
    if (response.status === 503 || response.status === 404) return 'not_configured';

    const result = await response.json().catch(() => ({}));
    console.error('Feedback email delivery failed:', result);
    return 'failed';
  } catch (error) {
    console.error('Feedback email delivery failed:', error);
    return 'failed';
  }
}

export default function FeedbackPage() {
  const { addToast } = useStore();
  const [reportType, setReportType] = useState<ReportType>('bug');
  const [priority, setPriority] = useState<ReportPriority>('normal');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const safeTitle = sanitizeText(title, 120);
    const safeMessage = sanitizePlainText(message, 3000);
    if (!safeMessage) {
      addToast({ type: 'error', title: 'Please write your feedback before submitting.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userResult.user;
      if (!user) {
        addToast({ type: 'error', title: 'Please log in to send feedback.' });
        return;
      }
      const { data: sessionResult } = await supabase.auth.getSession();
      const accessToken = sessionResult.session?.access_token;
      if (!accessToken) {
        addToast({ type: 'error', title: 'Please log in to send feedback.' });
        return;
      }

      const context = getFeedbackContext();
      const { data, error } = await supabase
        .from('feedback_reports')
        .insert({
          user_id: user.id,
          type: reportType,
          title: safeTitle || null,
          message: safeMessage,
          page_url: context.pageUrl || null,
          user_agent: context.userAgent || null,
          priority,
          metadata: {
            route: context.route || null,
            viewport: context.viewport,
            timestamp: context.submittedAt
          }
        })
        .select('id')
        .single();
      if (error) throw error;
      const emailState = await sendFeedbackEmail(data.id, accessToken);
      trackBetaEvent(user.id, 'feedback_submitted', { type: reportType, priority, route: context.route });
      setTitle('');
      setMessage('');
      if (emailState === 'sent') {
        addToast({ type: 'success', title: 'Thanks — your report was sent.' });
      } else if (emailState === 'not_configured') {
        addToast({
          type: 'info',
          title: 'Report saved',
          description: `Email delivery is not configured yet, so it was saved in Supabase instead. You can also email ${supportEmail}.`
        });
      } else {
        addToast({
          type: 'error',
          title: 'Report saved, email failed',
          description: `It is saved in Supabase, but Gmail delivery failed. You can also email ${supportEmail}.`
        });
      }
    } catch (error: any) {
      console.error('Feedback submission failed:', error);
      addToast({
        type: 'error',
        title: "Couldn't send report. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent">Closed beta</p>
        <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight">Feedback</h1>
        <p className="text-sm font-semibold text-text-secondary">Report bugs, broken content, profile issues, or product feedback.</p>
      </div>

      <div className="rounded-3xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Type</span>
          <SelectMenu
            value={reportType}
            onChange={value => setReportType(REPORT_TYPES.includes(value as ReportType) ? value as ReportType : 'feedback')}
            options={[
              { value: 'bug', label: 'Bug report' },
              { value: 'general', label: 'Report content/profile' },
              { value: 'feature_request', label: 'Feature request' },
              { value: 'feedback', label: 'Product feedback' }
            ]}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Priority</span>
          <SelectMenu
            value={priority}
            onChange={value => setPriority(PRIORITIES.includes(value as ReportPriority) ? value as ReportPriority : 'normal')}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Short title</span>
          <input value={title} onChange={event => setTitle(event.target.value)} className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold text-text-main" placeholder="Example: Profile modal overlaps on mobile" maxLength={120} />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details</span>
          <textarea value={message} onChange={event => setMessage(event.target.value)} className="w-full min-h-48 rounded-2xl bg-surface-muted border border-card-border p-4 text-sm font-semibold text-text-main resize-y" placeholder="What happened? Add links, steps, or expected behavior." />
        </label>

        <button onClick={submit} disabled={isSubmitting} className="h-12 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
          <Send size={16} />
          {isSubmitting ? 'Sending...' : 'Send feedback'}
        </button>
      </div>

      <div className="rounded-2xl border border-card-border bg-surface-muted p-4 text-sm text-text-secondary">
        Prefer email? Contact <a className="text-accent font-bold" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </div>
    </div>
  );
}
