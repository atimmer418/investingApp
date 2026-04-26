import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fredvested.Fred',
  appName: 'FRED',
  webDir: 'www',
  server: {
    url: 'https://local.fredvested.com'
  },
  ios: {
    backgroundColor: '#f8fafc'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // We will hide it manually
      launchAutoHide: false, // If true, it hides after launchShowDuration
      // backgroundColor: "#ffffff", // Optional
      // androidSplashResourceName: "splash", // Optional
      // androidScaleType: "CENTER_CROP", // Optional
      // showSpinner: true, // Optional
      // androidSpinnerStyle: "large", // Optional
      // iosSpinnerStyle: "small", // Optional
      // spinnerColor: "#999999", // Optional
      // splashFullScreen: true, // Optional
      // splashImmersive: true, // Optional
    },
    Keyboard: {
      resize: 'none' as any,
    }
  }
};

export default config;
