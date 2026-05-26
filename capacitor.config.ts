import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.fromone.app',
  appName: 'FromOne',
  webDir: 'public',
  server: {
    url: 'https://fromone.co.uk',
    cleartext: false,
  },
};

export default config;