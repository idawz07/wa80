import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fieldguide.wa80',
  appName: 'WA80-8 Guide',
  webDir: 'app-web',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always',
    scrollEnabled: true
  }
};

export default config;
