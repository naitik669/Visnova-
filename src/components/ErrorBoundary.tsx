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
    const details = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      route: window.location.pathname,
      timestamp: new Date().toISOString()
    };
    (window as any).__VISNOVA_LAST_ERROR__ = details;
    console.error('VisNova ErrorBoundary caught:', details, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const details = {
        message: this.state.error?.message || 'Unknown render error',
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        route: window.location.pathname,
        timestamp: new Date().toISOString()
      };
      const isDebugVisible = import.meta.env.DEV || import.meta.env.VITE_VISNOVA_BETA_DEBUG === 'true';
      const clearLocalState = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      };
      const copyErrorDetails = async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
        } catch {
          console.error('Could not copy VisNova error details:', details);
        }
      };
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
          <div className="max-w-2xl rounded-3xl border border-card-border bg-card p-6 text-center space-y-4">
            <h1 className="text-xl font-black text-text-main">Something broke</h1>
            <p className="text-sm font-semibold text-text-secondary">Refresh the app. If it happens again, send a bug report from Feedback.</p>
            {isDebugVisible && (
              <pre className="max-h-64 overflow-auto rounded-2xl bg-surface-muted p-3 text-left text-xs whitespace-pre-wrap text-text-secondary">
                {JSON.stringify(details, null, 2)}
              </pre>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button onClick={() => window.location.reload()} className="min-h-11 px-4 py-3 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest leading-tight">
                Refresh app
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="min-h-11 px-4 py-3 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest leading-tight">
                Go to Dashboard
              </button>
              <button onClick={copyErrorDetails} className="min-h-11 px-4 py-3 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest leading-tight">
                Copy error details
              </button>
              <button onClick={clearLocalState} className="min-h-11 px-4 py-3 rounded-2xl bg-danger/10 text-danger text-[10px] font-black uppercase tracking-widest leading-tight">
                Clear local state and reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
