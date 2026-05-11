import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackBetaEvent } from '../../lib/betaAnalytics';
import { sanitizePlainText, sanitizeText } from '../../lib/security';
import { useStore } from '../../store/useStore';
import { SelectMenu } from '../ui/SelectMenu';

const supportEmail = 'naitik.business69@gmail.com';

function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getFeedbackContext() {
  if (typeof window === 'undefined') {
    return { route: '', pageUrl: '', browser: '', device: 'unknown', submittedAt: new Date().toISOString() };
  }

  return {
    route: window.location.pathname + window.location.search,
    pageUrl: window.location.href,
    browser: navigator.userAgent,
    device: getDeviceType(),
    submittedAt: new Date().toISOString()
  };
}

function buildFeedbackMailto(category: string, severity: string, title: string, message: string, contactEmail: string) {
  const context = getFeedbackContext();
  const subject = encodeURIComponent(`VisNova feedback: ${category} - ${title || severity}`);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const body = encodeURIComponent([
    title ? `Title: ${title}` : '',
    `Severity: ${severity}`,
    message,
    '',
    contactEmail ? `Contact email: ${contactEmail}` : '',
    pageUrl ? `Page: ${pageUrl}` : '',
    context.route ? `Route: ${context.route}` : '',
    context.device ? `Device: ${context.device}` : '',
    context.browser ? `Browser: ${context.browser}` : '',
    `Timestamp: ${context.submittedAt}`
  ].filter(Boolean).join('\n'));

  return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
}

function isMissingFeedbackTable(error: any) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return text.includes('feedback_reports') && (text.includes('schema cache') || text.includes('could not find the table'));
}

export default function FeedbackPage() {
  const { session, addToast } = useStore();
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(session?.user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const safeTitle = sanitizeText(title, 120);
    const safeMessage = sanitizePlainText(message, 3000);
    const safeEmail = sanitizeText(contactEmail, 254).toLowerCase();
    if (!safeTitle || !safeMessage) {
      addToast({ type: 'error', title: 'Details required', description: 'Add a short title and describe what happened.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const context = getFeedbackContext();
      const { error } = await supabase.from('feedback_reports').insert({
        user_id: session?.user?.id || null,
        category,
        severity,
        title: safeTitle,
        message: safeMessage,
        contact_email: safeEmail || null,
        page_url: context.pageUrl || null,
        route: context.route || null,
        browser: context.browser || null,
        device: context.device,
        metadata: {
          submitted_at: context.submittedAt,
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null
        }
      });
      if (error) throw error;
      trackBetaEvent(session?.user?.id, 'feedback_submitted', { category, severity, route: context.route });
      setTitle('');
      setMessage('');
      addToast({ type: 'success', title: 'Feedback sent', description: 'Thanks. We will review it for beta stability.' });
    } catch (error: any) {
      console.error('Feedback submission failed:', error);
      const mailto = buildFeedbackMailto(category, severity, safeTitle, safeMessage, safeEmail);
      if (typeof window !== 'undefined') window.location.href = mailto;

      addToast({
        type: isMissingFeedbackTable(error) ? 'info' : 'error',
        title: isMissingFeedbackTable(error) ? 'Feedback email opened' : 'Feedback fallback opened',
        description: isMissingFeedbackTable(error)
          ? 'The feedback database is not ready yet, so an email draft was opened instead.'
          : `Could not save feedback in-app. Send the email draft to ${supportEmail}.`
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
            value={category}
            onChange={setCategory}
            options={[
              { value: 'bug', label: 'Bug report' },
              { value: 'content', label: 'Report content/profile' },
              { value: 'account', label: 'Account/support' },
              { value: 'feedback', label: 'Product feedback' }
            ]}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Severity</span>
          <SelectMenu
            value={severity}
            onChange={setSeverity}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' }
            ]}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Contact email</span>
          <input value={contactEmail} onChange={event => setContactEmail(event.target.value)} className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold text-text-main" placeholder="you@example.com" />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Short title</span>
          <input value={title} onChange={event => setTitle(event.target.value)} className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold text-text-main" placeholder="Example: Profile modal overlaps on mobile" maxLength={120} />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details</span>
          <textarea value={message} onChange={event => setMessage(event.target.value)} className="w-full min-h-48 rounded-2xl bg-surface-muted border border-card-border p-4 text-sm font-semibold text-text-main resize-y" placeholder="What happened? Add links, steps, or expected behavior." />
        </label>

        <button onClick={submit} disabled={isSubmitting || !title.trim() || !message.trim()} className="h-12 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
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
