import React from 'react';

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('VisNova render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
          <div className="max-w-md rounded-3xl border border-card-border bg-card p-6 text-center space-y-4">
            <h1 className="text-xl font-black text-text-main">Something broke</h1>
            <p className="text-sm font-semibold text-text-secondary">Refresh the app. If it happens again, send a bug report from Feedback.</p>
            <button onClick={() => window.location.reload()} className="h-11 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
