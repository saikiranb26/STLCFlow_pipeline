"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const test_1 = require("@playwright/test");
const playwright_bdd_1 = require("playwright-bdd");
const projectRoot = __dirname;
const artifactsRoot = node_path_1.default.join(projectRoot, "artifacts");
const authStatePath = node_path_1.default.join(projectRoot, ".auth", "auth-state.json");
const testDir = (0, playwright_bdd_1.defineBddConfig)({
    featuresRoot: ".",
    features: ["tests/bdd/features/**/*.feature"],
    steps: ["tests/bdd/steps/**/*.ts", "tests/bdd/fixtures/**/*.ts", "tests/bdd/hooks/**/*.ts"],
    outputDir: ".features-gen",
    missingSteps: "fail-on-run",
    quotes: "double"
});
exports.default = (0, test_1.defineConfig)({
    testDir,
    timeout: 2 * 60 * 1000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [
        ["line"],
        ["allure-playwright", { resultsDir: node_path_1.default.join(artifactsRoot, "allure-results") }]
    ],
    outputDir: node_path_1.default.join(artifactsRoot, "test-output"),
    use: {
        headless: process.env.PW_HEADLESS === "1" || process.env.CI === "true",
        channel: "chrome",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        viewport: { width: 1440, height: 900 },
        actionTimeout: 15_000,
        navigationTimeout: 45_000,
        baseURL: process.env.APP_BASE_URL,
        storageState: node_fs_1.default.existsSync(authStatePath) ? authStatePath : undefined
    }
});
