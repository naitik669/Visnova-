import React from 'react';

type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('VisNova ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
          <div className="max-w-md rounded-3xl border border-card-border bg-card p-6 text-center space-y-4">
            <h1 className="text-xl font-black text-text-main">Something broke</h1>
            <p className="text-sm font-semibold text-text-secondary">Refresh the app. If it happens again, send a bug report from Feedback.</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="max-h-40 overflow-auto rounded-2xl bg-surface-muted p-3 text-left text-xs whitespace-pre-wrap text-text-secondary">
                {this.state.error.message}
              </pre>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={() => window.location.reload()} className="h-11 px-4 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">
                Refresh app
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="h-11 px-4 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest">
                Dashboard
              </button>
              <button onClick={() => { window.location.href = '/feedback'; }} className="h-11 px-4 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest">
                Bug report
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
