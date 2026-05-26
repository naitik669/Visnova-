import {StrictMode} from 'react';
import { useEffect } from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { applyAppPreferences } from './lib/appPreferences.ts';
import { useCookieConsent } from './hooks/useCookieConsent.ts';
import { initPostHog, syncPostHogConsent } from './lib/posthog.ts';

applyAppPreferences();
initPostHog();

function ConsentedAnalytics() {
  const { canUseAnalytics } = useCookieConsent();

  useEffect(() => {
    syncPostHogConsent(canUseAnalytics);
  }, [canUseAnalytics]);

  return canUseAnalytics ? <Analytics /> : null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ConsentedAnalytics />
  </StrictMode>,
);
