import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'My AWESOME Investing Appga',
  webDir: 'www',
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
    }
  }
};

export default config;
