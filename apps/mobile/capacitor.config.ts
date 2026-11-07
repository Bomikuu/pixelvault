import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "ph.pixelvault.app",
  appName: "PixelVault",
  webDir: "dist",
  server: { androidScheme: "https", cleartext: false },
  android: { allowMixedContent: false },
  plugins: { CapacitorHttp: { enabled: false } },
};
export default config;
