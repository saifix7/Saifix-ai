const config = {
  appId: "com.saifix.ai",
  appName: "Saifix AI",
  webDir: "dist",
  server: {
    androidScheme: "https",
    url:
      process.env.SAIFIX_SERVER_URL ||
      "https://ais-pre-kcl2tvbbboce2zhlmqqk6s-980774839069.asia-east1.run.app",
    cleartext: true,
    allowNavigation: [
      "*.run.app",
      "accounts.google.com",
      "*.google.com",
      "*.googleusercontent.com",
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
