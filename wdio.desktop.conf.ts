import type { Options } from "@wdio/types";

export const config: Options.Testrunner = {
  runner: "local",
  specs: ["./apps/desktop/e2e/**/*.spec.ts"],
  maxInstances: 1,
  services: [["@wdio/tauri-service", {
    appBinaryPath: "./apps/desktop/src-tauri/target/debug/marnote",
    driverProvider: "embedded",
    embeddedPort: 4445,
    captureBackendLogs: true,
    captureFrontendLogs: true,
    logDir: "./artifacts/desktop-e2e/logs",
  }]],
  capabilities: [{ browserName: "tauri" }],
  framework: "mocha",
  reporters: ["spec"],
  outputDir: "./artifacts/desktop-e2e",
  mochaOpts: { ui: "bdd", timeout: 60_000 },
  afterTest: async (_test, _context, { error }) => {
    if (error) await browser.saveScreenshot(`./artifacts/desktop-e2e/failure-${Date.now()}.png`);
  },
};
