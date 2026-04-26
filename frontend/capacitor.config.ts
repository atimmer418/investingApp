import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fredvested.Fred',
  appName: 'FRED',
  webDir: 'www',
  server: {
    url: 'https://local.fredvested.com'
  },
  ios: {
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000, // auto-hide ceiling if JS hide call is late
      launchAutoHide: true,  // safety net — auto-hides at 3s if platform.ready() is slow
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
