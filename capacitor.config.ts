import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luneacab.app',
  appName: 'LuneaCab',
  webDir: 'dist/public',
  plugins: {
    FirebaseAuthentication: {
      providers: ["phone"]
    }
  }
};

export default config;