import { defineConfig } from 'vite';
// If you're using Angular plugin for Vite (less common if Angular CLI handles it all)
// import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  // plugins: [
  //   angular(), // Only if you are using AnalogJS or a similar setup that requires this
  // ],
  optimizeDeps: {
    exclude: [
      '@ionic/core', // The core Ionic web components
      '@ionic/angular', // The Angular wrapper/integration for Ionic
      // You might also see specific entry points like 'ion-app', but excluding the main packages is usually better.
      // 'ion-app', // Less common to exclude individual component entries directly
      // 'ion-router-outlet'
    ],
    // You might also need to include some Ionic files if they are dynamically imported
    // and Vite is not picking them up.
    // include: [
    //   '@ionic/core/dist/esm/ion-app.entry.js', // Example, adjust path/file as needed
    //   '@ionic/core/dist/esm/ion-router-outlet.entry.js'
    // ]
  },
  // If you are using Angular CLI's default build, you might not need to specify 'build' options here
  // unless you are completely overriding Angular's Vite integration.
});