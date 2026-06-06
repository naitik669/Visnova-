import { ArrowLeft, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

type ClosedBetaFallbackProps = {
  title: string;
  description?: string;
  showLogProof?: boolean;
};

export function ClosedBetaFallback({ title, description, showLogProof = false }: ClosedBetaFallbackProps) {
  return (
    <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-lg shadow-accent/10">
        <Sparkles size={22} />
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-accent">Closed beta</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-text-main">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-text-secondary">
        {description || 'This part of VisNova is being polished. The closed beta is focused on Vision, Task, Proof, and Progress Pulse.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
        {showLogProof && (
          <Link
            to="/dashboard"
            state={{ openProgressLog: true }}
            className="inline-flex items-center gap-2 rounded-2xl border border-accent/25 bg-accent/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-accent"
          >
            <Zap size={14} />
            Log Proof
          </Link>
        )}
        <Link
          to="/feedback"
          className="inline-flex items-center gap-2 rounded-2xl border border-card-border bg-card px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-main"
        >
          <MessageSquare size={14} />
          Send Feedback
        </Link>
      </div>
    </div>
  );
}
