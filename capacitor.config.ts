import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sputnikworkshop.crosspulse',
  appName: 'Crosspulse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
