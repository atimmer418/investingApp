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
      launchShowDuration: 3000, // ignored when launchAutoHide is false
      launchAutoHide: false,  // splash stays until Angular calls SplashScreen.hide() — prevents premature fade on slow server loads
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
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  }
};

export default config;
