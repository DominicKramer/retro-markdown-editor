import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.markdown.retro',
  appName: 'Retro Markdown',
  webDir: 'build',
  bundledWebRuntime: false,
  plugins: {
    keyboard: {
      style: "dark",
    },
  },
};

export default config;
