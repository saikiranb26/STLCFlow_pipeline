import path from "node:path";
import { writeJson } from "../../utils/fs";
import type { FlowContext, StageResult } from "../types";
import { getFlowAgentBestPractices } from "./agent-catalog";
import type { ScenarioExplorationAgent } from "./types";

export const scenarioExplorationAgent: ScenarioExplorationAgent = {
  async collectEvidence(context: FlowContext): Promise<StageResult> {
    const artifactPath = path.join(context.storyArtifactsRoot, "ui-evidence-plan.json");
    const hasNavigationPath = Boolean(context.input.navigationPath && context.input.navigationPath.trim());

    writeJson(artifactPath, {
      agent: "Scenario Exploration Agent",
      usePlaywrightMcpAsPrimary: true,
      useChromeDevToolsMcpAsSecondary: true,
      bestPractices: getFlowAgentBestPractices("scenarioExploration"),
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
