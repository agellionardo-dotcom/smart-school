import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartschool.app',
  appName: 'Smart School',
  webDir: 'build',
  server: {
    androidScheme: 'https',  // ⚠️ غيرناها من http إلى https
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true
  }
};

export default config;