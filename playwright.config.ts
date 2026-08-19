import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const projectRoot = __dirname;
const artifactsRoot = path.join(projectRoot, "artifacts");
const authStatePath = path.join(projectRoot, ".auth", "auth-state.json");
const allureResultsDir = process.env.STLCFLOW_ALLURE_RESULTS_DIR || path.join(artifactsRoot, "allure-results");
const testOutputDir = process.env.STLCFLOW_TEST_OUTPUT_DIR || path.join(artifactsRoot, "test-output");

const testDir = defineBddConfig({
  featuresRoot: ".",
  features: ["tests/bdd/features/**/*.feature"],
  steps: ["tests/bdd/steps/**/*.ts", "tests/bdd/fixtures/**/*.ts", "tests/bdd/hooks/**/*.ts"],
  outputDir: ".features-gen",
  missingSteps: "fail-on-run",
  quotes: "double"
});

export default defineConfig({
  testDir,
  timeout: 2 * 60 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["line"],
    ["allure-playwright", { resultsDir: allureResultsDir }]
  ],
  outputDir: testOutputDir,
  use: {
    headless: process.env.PW_HEADLESS === "1" || process.env.CI === "true",
    channel: "chrome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    baseURL: process.env.APP_BASE_URL,
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  }
});
