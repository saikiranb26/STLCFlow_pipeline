"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioExplorationAgent = void 0;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../../utils/fs");
exports.scenarioExplorationAgent = {
    async collectEvidence(context) {
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "ui-evidence-plan.json");
        const hasNavigationPath = Boolean(context.input.navigationPath && context.input.navigationPath.trim());
        (0, fs_1.writeJson)(artifactPath, {
            agent: "Scenario Exploration Agent",
            usePlaywrightMcpAsPrimary: true,
            useChromeDevToolsMcpAsSecondary: true,
            navigationPath: context.input.navigationPath || "",
            mode: hasNavigationPath ? "ready-for-ui-evidence" : "requirement-first",
            notes: hasNavigationPath
                ? [
                    "Use Playwright MCP to inspect the current module flow.",
                    "Use Chrome DevTools MCP only when locator help or debugging is needed."
                ]
                : [
                    "No navigation path provided yet.",
                    "Skip live UI evidence until a build path or navigation path is available."
                ]
        });
        return {
            key: "collectEvidence",
            agentKey: "scenarioExploration",
            status: hasNavigationPath ? "completed" : "skipped",
            summary: hasNavigationPath
                ? "Scenario Exploration Agent prepared the UI evidence plan for Playwright-led browser inspection."
                : "Scenario Exploration Agent skipped live UI evidence planning because no navigation path is available yet.",
            artifactPaths: [artifactPath]
        };
    }
};
