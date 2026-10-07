import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartschool.app',
  appName: 'Smart School',
  webDir: 'build',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0A1F44',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;