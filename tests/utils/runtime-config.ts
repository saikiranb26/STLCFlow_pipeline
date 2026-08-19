import fs from "node:fs";
import path from "node:path";
import { loadAdoCodexConfig, loadPlaywrightCodexConfig, type AdoCodexConfig, type PlaywrightCodexConfig } from "./codex-config";

export interface AutomationRuntimeConfig {
  projectRoot: string;
  artifactsRoot: string;
  allureResultsDir: string;
  allureReportDir: string;
  testOutputDir: string;
  authStatePath: string;
  mcpProfileDir: string;
  mcpOutputDir: string;
  browserChannel: "chrome";
  viewport: {
    width: number;
    height: number;
  };
  playwright: PlaywrightCodexConfig;
  ado: AdoCodexConfig;
}

export function loadAutomationRuntimeConfig(projectRoot = process.cwd()): AutomationRuntimeConfig {
  return {
    projectRoot,
    artifactsRoot: path.join(projectRoot, "artifacts"),
    allureResultsDir: path.join(projectRoot, "artifacts", "allure-results"),
    allureReportDir: path.join(projectRoot, "artifacts", "allure-report"),
    testOutputDir: path.join(projectRoot, "artifacts", "test-output"),
    authStatePath: path.join(projectRoot, ".auth", "auth-state.json"),
    mcpProfileDir: path.join(projectRoot, ".playwright-mcp", "profile"),
    mcpOutputDir: path.join(projectRoot, ".playwright-mcp", "output"),
    browserChannel: "chrome",
    viewport: { width: 1440, height: 900 },
    playwright: loadPlaywrightCodexConfig(),
    ado: loadAdoCodexConfig()
  };
}

export function ensureAutomationRuntimeDirs(runtime: AutomationRuntimeConfig): void {
  [
    runtime.artifactsRoot,
    runtime.allureResultsDir,
    runtime.allureReportDir,
    runtime.testOutputDir,
    path.dirname(runtime.authStatePath),
    runtime.mcpProfileDir,
    runtime.mcpOutputDir
  ].forEach((dirPath) => fs.mkdirSync(dirPath, { recursive: true }));
}
