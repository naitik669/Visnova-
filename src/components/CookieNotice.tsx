import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem('visnova_cookie_notice_ack') !== 'true');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-4 lg:left-auto lg:right-4 lg:w-[420px] z-[250] rounded-2xl border border-card-border bg-card p-4 shadow-2xl">
      <p className="text-sm font-semibold text-text-secondary leading-relaxed">
        VisNova uses essential cookies/browser storage for login, security, preferences, and app state. Analytics cookies are not configured in this build.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            localStorage.setItem('visnova_cookie_notice_ack', 'true');
            setVisible(false);
          }}
          className="h-10 px-4 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest"
        >
          Got it
        </button>
        <Link to="/cookies" className="h-10 px-4 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest inline-flex items-center">
          Cookie policy
        </Link>
      </div>
    </div>
  );
}
