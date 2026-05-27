import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export const getMobileAuthRedirectUrl = () => 'visnova://auth/callback';

export const getPlatformAuthRedirectUrl = (webRedirectUrl: string) => {
  return isNativePlatform() ? getMobileAuthRedirectUrl() : webRedirectUrl;
};
