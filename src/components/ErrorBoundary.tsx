import React from 'react';
import { VisNovaMotion } from './ui/VisNovaMotion';

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
      const sendBugReport = () => {
        window.location.href = '/feedback?type=bug';
      };
      const copyErrorDetails = async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
        } catch {
          console.error('Could not copy VisNova error details:', details);
        }
      };
      return (
        <div className="min-h-screen w-screen bg-bg-base px-5 py-8 text-center text-text-main">
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center justify-center">
            <VisNovaMotion variant="error" size="lg" className="w-full max-w-3xl" />
            <div className="mt-[-1rem] flex max-w-xl flex-col items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Something didn't load right.</h1>
              <p className="text-sm font-semibold leading-6 text-text-secondary sm:text-base">Refresh the page and we'll try again.</p>
            </div>
            {isDebugVisible && (
              <pre className="mt-5 max-h-64 w-full max-w-3xl overflow-auto rounded-2xl bg-surface-muted p-3 text-left text-xs whitespace-pre-wrap text-text-secondary">
                {JSON.stringify(details, null, 2)}
              </pre>
            )}
            <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
              <button onClick={() => window.location.reload()} className="min-h-11 px-4 py-3 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest leading-tight">
                Refresh
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="min-h-11 px-4 py-3 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest leading-tight">
                Go to Dashboard
              </button>
              <button onClick={sendBugReport} className="min-h-11 px-4 py-3 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest leading-tight">
                Send Bug Report
              </button>
            </div>
            {isDebugVisible && (
              <div className="mt-2 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                <button onClick={copyErrorDetails} className="min-h-11 px-4 py-3 rounded-2xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest leading-tight">
                  Copy error details
                </button>
                <button onClick={clearLocalState} className="min-h-11 px-4 py-3 rounded-2xl bg-danger/10 text-danger text-[10px] font-black uppercase tracking-widest leading-tight">
                  Clear local state and reload
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
