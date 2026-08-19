"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAutomationRuntimeConfig = loadAutomationRuntimeConfig;
exports.ensureAutomationRuntimeDirs = ensureAutomationRuntimeDirs;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const codex_config_1 = require("./codex-config");
function loadAutomationRuntimeConfig(projectRoot = process.cwd()) {
    return {
        projectRoot,
        artifactsRoot: node_path_1.default.join(projectRoot, "artifacts"),
        allureResultsDir: node_path_1.default.join(projectRoot, "artifacts", "allure-results"),
        allureReportDir: node_path_1.default.join(projectRoot, "artifacts", "allure-report"),
        testOutputDir: node_path_1.default.join(projectRoot, "artifacts", "test-output"),
        authStatePath: node_path_1.default.join(projectRoot, ".auth", "auth-state.json"),
        mcpProfileDir: node_path_1.default.join(projectRoot, ".playwright-mcp", "profile"),
        mcpOutputDir: node_path_1.default.join(projectRoot, ".playwright-mcp", "output"),
        browserChannel: "chrome",
        viewport: { width: 1440, height: 900 },
        playwright: (0, codex_config_1.loadPlaywrightCodexConfig)(),
        ado: (0, codex_config_1.loadAdoCodexConfig)()
    };
}
function ensureAutomationRuntimeDirs(runtime) {
    [
        runtime.artifactsRoot,
        runtime.allureResultsDir,
        runtime.allureReportDir,
        runtime.testOutputDir,
        node_path_1.default.dirname(runtime.authStatePath),
        runtime.mcpProfileDir,
        runtime.mcpOutputDir
    ].forEach((dirPath) => node_fs_1.default.mkdirSync(dirPath, { recursive: true }));
}
