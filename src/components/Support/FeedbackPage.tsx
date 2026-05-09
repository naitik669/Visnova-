import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sanitizePlainText, sanitizeText } from '../../lib/security';
import { useStore } from '../../store/useStore';
import { SelectMenu } from '../ui/SelectMenu';

const supportEmail = 'naitik.business69@gmail.com';

function buildFeedbackMailto(category: string, message: string, contactEmail: string) {
  const subject = encodeURIComponent(`VisNova feedback: ${category}`);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const body = encodeURIComponent([
    message,
    '',
    contactEmail ? `Contact email: ${contactEmail}` : '',
    pageUrl ? `Page: ${pageUrl}` : ''
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
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(session?.user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const safeMessage = sanitizePlainText(message, 3000);
    const safeEmail = sanitizeText(contactEmail, 254).toLowerCase();
    if (!safeMessage) {
      addToast({ type: 'error', title: 'Message required', description: 'Describe the issue or feedback first.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback_reports').insert({
        user_id: session?.user?.id || null,
        category,
        message: safeMessage,
        contact_email: safeEmail || null,
        page_url: typeof window !== 'undefined' ? window.location.href : null
      });
      if (error) throw error;
      setMessage('');
      addToast({ type: 'success', title: 'Feedback sent', description: 'Thanks. We will review it for beta stability.' });
    } catch (error: any) {
      console.error('Feedback submission failed:', error);
      const mailto = buildFeedbackMailto(category, safeMessage, safeEmail);
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
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Contact email</span>
          <input value={contactEmail} onChange={event => setContactEmail(event.target.value)} className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold text-text-main" placeholder="you@example.com" />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details</span>
          <textarea value={message} onChange={event => setMessage(event.target.value)} className="w-full min-h-48 rounded-2xl bg-surface-muted border border-card-border p-4 text-sm font-semibold text-text-main resize-y" placeholder="What happened? Add links, steps, or expected behavior." />
        </label>

        <button onClick={submit} disabled={isSubmitting || !message.trim()} className="h-12 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
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
