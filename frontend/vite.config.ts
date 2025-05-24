import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: [
      '@ionic/core',
      '@ionic/angular',
      'ionicons'
    ]
  }
});