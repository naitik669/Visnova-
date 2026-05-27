import { useState } from 'react';
import { Bug, Loader2, Mail, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackBetaEvent } from '../../lib/betaAnalytics';
import { sanitizePlainText, sanitizeText } from '../../lib/security';
import { useStore } from '../../store/useStore';
import { SelectMenu } from '../ui/SelectMenu';
import { VisNovaMotion } from '../ui/VisNovaMotion';

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
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      setIsSubmitted(true);
      if (emailState === 'sent') {
        addToast({ type: 'success', title: 'Thanks - your report was sent.' });
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

  if (isSubmitted) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center space-y-5 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] text-center sm:pb-20">
        <VisNovaMotion variant="reportSent" className="max-w-[260px] sm:max-w-md" />
        <h1 className="max-w-sm text-2xl font-black tracking-tight text-text-main">Thanks - your report was sent.</h1>
        <p className="max-w-md text-sm font-semibold leading-6 text-text-secondary">
          We saved it for review. If email delivery is configured, the team will receive it there too.
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-sm shadow-accent/20 sm:w-auto"
        >
          Send another report
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:pb-20">
      <div className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent sm:hidden">
          <Bug size={18} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent">Closed beta</p>
        <h1 className="text-2xl font-black tracking-tight text-text-main sm:text-4xl">Feedback</h1>
        <p className="text-sm font-semibold text-text-secondary">Report bugs, broken content, profile issues, or product feedback.</p>
      </div>

      <div className="space-y-4 rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Short title</span>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="h-12 w-full rounded-2xl border border-card-border bg-surface-muted px-4 text-sm font-semibold text-text-main outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
            placeholder="Example: Profile modal overlaps on mobile"
            maxLength={120}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details</span>
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            className="min-h-[34dvh] w-full resize-y rounded-2xl border border-card-border bg-surface-muted p-4 text-sm font-semibold text-text-main outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10 sm:min-h-48"
            placeholder="What happened? Add links, steps, or expected behavior."
          />
        </label>

        <div className="rounded-2xl border border-card-border bg-app-container p-4 text-xs font-semibold leading-5 text-text-secondary">
          We include the current route, viewport, and browser info so the report is easier to reproduce.
        </div>

        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-card-border bg-card/95 p-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button onClick={submit} disabled={isSubmitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-sm shadow-accent/20 disabled:opacity-50 sm:w-auto">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? 'Sending...' : 'Send feedback'}
          </button>
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-card-border bg-surface-muted p-4 text-sm text-text-secondary">
        <Mail size={18} className="mt-0.5 shrink-0 text-accent" />
        <p>
          Prefer email? Contact{' '}
          <a className="break-all font-bold text-accent" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
