import path from "node:path";
import { generateAutomationArtifacts } from "../automation-generation";
import { ensureDir, writeJson } from "../../utils/fs";
import type { FlowContext, StageResult } from "../types";
import { getExpectedWorkbookPath, resolveApprovedWorkbookPath } from "../workbook-conventions";
import { getFlowAgentBestPractices } from "./agent-catalog";
import type { FrameworkAgent } from "./types";
import { getStoryFolderName } from "../story-folder";

export const frameworkAgent: FrameworkAgent = {
  async generateAutomation(context: FlowContext, locatorPlanPath: string): Promise<StageResult> {
    const storyAutomationRoot = path.join(context.storyArtifactsRoot, "automation");
    const storyFolderName = getStoryFolderName(context);
    ensureDir(storyAutomationRoot);

    const artifactPath = path.join(context.storyArtifactsRoot, "automation-generation-plan.json");
    writeJson(artifactPath, {
      agent: "Framework Agent",
      collaboratingAgents: ["Locator Agent"],
      bestPractices: getFlowAgentBestPractices("framework"),
      framework: {
        language: "TypeScript",
        runner: "Playwright",
        style: "BDD",
        configFiles: [
          "playwright.config.ts",
          ".vscode/playwright-mcp.config.json",
          "tests/bdd/fixtures/test.ts",
          "tests/bdd/steps/bdd.ts"
        ]
      },
      sourceOfTruth: {
        reviewedWorkbook: resolveApprovedWorkbookPath(context.projectRoot, context.input)?.path || "",
        expectedWorkbookPath: getExpectedWorkbookPath(context.projectRoot, context.input),
        locatorPlanPath,
        requiredInputs: [
          "approved workbook in artifacts/generated-excel or explicit override",
          "sidecar metadata",
          "reference knowledge",
          "playwright evidence when available",
          "locator strategy from Locator Agent"
        ]
      },
      storyArtifacts: {
        manifestPath: path.join(storyAutomationRoot, "story-automation-manifest.json"),
        traceabilityIndexPath: path.join(storyAutomationRoot, "story-automation-traceability-index.json"),
        storyFolderName,
        generatedFeatureRoot: path.join(context.testsRoot, "bdd", "features", "generated", storyFolderName),
        generatedDataRoot: path.join(context.testsRoot, "data", "generated", storyFolderName),
        generatedStepDefinitionsRoot: path.join(context.testsRoot, "bdd", "steps", "generated", storyFolderName),
        generatedPageObjectsRoot: path.join(context.testsRoot, "pages", "generated", storyFolderName),
        generatedSpecRoot: path.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated", storyFolderName),
        reportRunsRoot: path.join(context.artifactsRoot, storyFolderName, "runs")
      },
      traceabilityContract: {
        featureFileName: "story-<workItemId>-suite-<suiteId>.feature",
        generatedSpecName: "story-<workItemId>-suite-<suiteId>.feature.spec.js",
        scenarioTitle: "<testCaseId>: <testcase title>",
        visibleTestcaseTag: "@<testCaseId>",
        visibleTraceabilityRule:
          "Keep feature-visible tags aligned to the original repo style: module tags plus numeric testcase IDs only.",
        internalTraceabilityRule:
          "Keep story, suite, plan, and tc IDs in manifest, scenario data, reports, and ADO mappings instead of visible Given/When/Then text.",
        lookupIndex: "artifacts/stories/<storyId>/automation/story-automation-traceability-index.json"
      },
      executionRule: [
        "Generate automation only from the approved workbook and sidecar metadata.",
        "Keep story-specific generated code in draft storage until the testcase executes reliably.",
        "Do not hardcode story behavior into the shared framework.",
        "Use Playwright as the execution engine and ADO/API for result publication.",
        "Every generated testcase must be traceable by testcase ID, scenario title, feature file, and generated spec path."
      ],
      frameworkFolders: [
        "approved workbook",
        "tests/bdd/features",
        "tests/bdd/steps",
        "tests/pages",
        "tests/bdd/steps/generated/<story-folder>",
        "tests/pages/generated/<story-folder>",
        "tests/bdd/fixtures",
        "tests/utils",
        "tests/data",
        "tests/bdd/hooks"
      ]
    });

    if (!resolveApprovedWorkbookPath(context.projectRoot, context.input)) {
      return {
        key: "generateAutomation",
        agentKey: "framework",
        status: "blocked",
        summary: "Framework Agent is blocked because the approved workbook could not be resolved.",
        artifactPaths: [artifactPath, locatorPlanPath],
        nextAction: `Save the reviewed workbook under ${path.join(context.projectRoot, "artifacts", "generated-excel")} using the story name or work item ID, or provide approvedWorkbookPath explicitly.`
      };
    }

    let generated: Awaited<ReturnType<typeof generateAutomationArtifacts>>;
    try {
      generated = await generateAutomationArtifacts(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeJson(artifactPath, {
        agent: "Framework Agent",
        collaboratingAgents: ["Locator Agent"],
        status: "blocked",
        reason: message,
        bestPractices: getFlowAgentBestPractices("framework"),
        sourceOfTruth: {
          reviewedWorkbook: resolveApprovedWorkbookPath(context.projectRoot, context.input)?.path || "",
          locatorPlanPath
        }
      });

      return {
        key: "generateAutomation",
        agentKey: "framework",
        status: "blocked",
        summary: `Framework Agent blocked automation generation because generated steps still need parser or POM support: ${message}`,
        artifactPaths: [artifactPath, locatorPlanPath],
        nextAction: "Add shared parser rules or POM support for the unsupported workbook actions, then regenerate automation."
      };
    }

    return {
      key: "generateAutomation",
      agentKey: "framework",
      status: "completed",
      summary: `Framework Agent generated ${generated.scenarioCount} story-specific automation scenario files, feature files, and traceability artifacts from the approved workbook.`,
      artifactPaths: [artifactPath, locatorPlanPath, ...generated.artifactPaths]
    };
  }
};
