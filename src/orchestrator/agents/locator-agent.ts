import path from "node:path";
import { writeJson } from "../../utils/fs";
import type { FlowContext } from "../types";
import { resolveApprovedWorkbookPath } from "../workbook-conventions";
import { getFlowAgentBestPractices } from "./agent-catalog";
import type { LocatorAgent } from "./types";

export const locatorAgent: LocatorAgent = {
  prepareLocatorStrategy(context: FlowContext): string {
    const artifactPath = path.join(context.storyArtifactsRoot, "locator-generation-plan.json");

    writeJson(artifactPath, {
      agent: "Locator Agent",
      bestPractices: getFlowAgentBestPractices("locator"),
      sourceOfTruth: {
        approvedWorkbook: resolveApprovedWorkbookPath(context.projectRoot, context.input)?.path || "",
        uiEvidencePlan: path.join(context.storyArtifactsRoot, "ui-evidence-plan.json"),
        storySummary: path.join(context.storyArtifactsRoot, "story-summary.json")
      },
      locatorRanking: [
        "role and accessible name",
        "label and placeholder",
        "test id or stable application attribute",
        "visible text scoped by region",
        "CSS selector only when no user-facing or stable attribute exists"
      ],
      fallbackPolicy: [
        "Prefer Playwright locators that describe user intent.",
        "Scope locators to pages, dialogs, grids, or rows before matching text.",
        "Do not generate brittle absolute XPath selectors.",
        "Record locator uncertainty in scenario data instead of pretending a selector is verified."
      ],
      handoffToFrameworkAgent: {
        expectedConsumers: [
          "tests/pages",
          "tests/pages/generated/<story-folder>",
          "tests/bdd/steps/generated-scenario.steps.ts",
          "tests/bdd/steps/generated/<story-folder>",
          "tests/utils/scenario-runner.ts",
          "tests/data/generated/<story-folder>"
        ],
        generatedArtifactsShouldReferenceTestCaseId: true
      }
    });

    return artifactPath;
  }
};
