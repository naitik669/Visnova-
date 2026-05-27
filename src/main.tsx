import {StrictMode} from 'react';
import { useEffect } from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { applyAppPreferences } from './lib/appPreferences.ts';
import { useCookieConsent } from './hooks/useCookieConsent.ts';
import { initAnalytics, optInAnalytics, optOutAnalytics } from './lib/analytics.ts';
import { setupDeepLinks } from './lib/deepLinks.ts';

applyAppPreferences();
initAnalytics();
setupDeepLinks();

function ConsentedAnalytics() {
  const { canUseAnalytics } = useCookieConsent();

  useEffect(() => {
    if (canUseAnalytics) {
      optInAnalytics();
    } else {
      optOutAnalytics();
    }
  }, [canUseAnalytics]);

  return canUseAnalytics ? <Analytics /> : null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ConsentedAnalytics />
  </StrictMode>,
);
