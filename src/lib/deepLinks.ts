import { App as CapacitorApp } from '@capacitor/app';
import { isNativePlatform } from './capacitor';

let deepLinksSetup = false;

const authCallbackPath = '/auth/callback';

export const setupDeepLinks = () => {
  if (deepLinksSetup || !isNativePlatform()) return;
  deepLinksSetup = true;

  CapacitorApp.addListener('appUrlOpen', (event) => {
    if (!event.url) return;

    try {
      const url = new URL(event.url);
      const isAuthCallback =
        event.url.includes('auth/callback') ||
        (url.protocol === 'visnova:' && url.hostname === 'auth' && url.pathname === '/callback') ||
        (url.protocol === 'com.visnova.app:' && url.hostname === 'auth' && url.pathname === '/callback');

      if (!isAuthCallback) return;

      const query = url.search || '';
      const hash = url.hash || '';
      window.location.assign(`${authCallbackPath}${query}${hash}`);
    } catch {
      if (event.url.includes('auth/callback')) {
        const suffix = event.url.split('auth/callback')[1] || '';
        window.location.assign(`${authCallbackPath}${suffix}`);
      }
    }
  });

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (window.location.pathname !== '/' && (canGoBack || window.history.length > 1)) {
      window.history.back();
      return;
    }

    CapacitorApp.exitApp();
  });
};
