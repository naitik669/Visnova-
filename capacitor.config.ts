import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.visnova.app',
  appName: 'VisNova',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#F7F3FF',
      launchShowDuration: 1200,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;
