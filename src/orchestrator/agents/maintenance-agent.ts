import path from "node:path";
import fs from "node:fs";
import { executeGeneratedStory } from "../story-execution";
import { readJson, writeJson } from "../../utils/fs";
import type { FlowContext, StageResult } from "../types";
import { resolveApprovedWorkbookPath } from "../workbook-conventions";
import { getFlowAgentBestPractices } from "./agent-catalog";
import type { MaintenanceAgent } from "./types";

interface ExecutionRuntimeShape {
  runArtifactId?: string;
  runArtifactsRoot?: string;
  storyFolderName?: string;
  allureResultsDir?: string;
  allureReportDir?: string;
  allureReportUrl?: string;
  allureServerPort?: number;
  allureReportSkipped?: boolean;
  allureReportSkipReason?: string;
  testOutputDir?: string;
}

export const maintenanceAgent: MaintenanceAgent = {
  async executeTests(context: FlowContext): Promise<StageResult> {
    const manifestPath = path.join(context.storyArtifactsRoot, "automation", "story-automation-manifest.json");
    const maintenancePlanPath = path.join(context.storyArtifactsRoot, "maintenance-plan.json");
    const artifactPath = path.join(context.storyArtifactsRoot, "execution-plan.json");

    writeJson(maintenancePlanPath, {
      agent: "Maintenance Agent",
      bestPractices: getFlowAgentBestPractices("maintenance"),
      scope: {
        workItemId: context.input.workItemId,
        suiteId: context.input.suiteId,
        testPlanId: context.input.testPlanId,
        manifestPath
      },
      selfHealingPolicy: [
        "Do not mark a case passed from assumptions.",
        "Classify failure cause before changing framework code.",
        "Prefer stable locator or page-object improvements over generated scenario rewrites.",
        "Keep traceability by testcase ID when refactoring generated files."
      ],
      failureClassifications: [
        "product bug",
        "automation issue",
        "environment or data issue",
        "blocked by unsupported workflow state"
      ]
    });

    writeJson(artifactPath, {
      agent: "Maintenance Agent",
      bestPractices: getFlowAgentBestPractices("maintenance"),
      mainRunner: "Playwright Test + Playwright browser engine",
      orchestrationSupport: "Playwright MCP",
      secondaryDebugLayer: "Chrome DevTools MCP",
      frameworkEntryPoints: {
        config: path.join(context.projectRoot, "playwright.config.ts"),
        authBootstrap: path.join(context.projectRoot, "tests", "utils", "bootstrap-auth.ts"),
        frameworkHealthFeature: path.join(context.projectRoot, "tests", "bdd", "features", "framework-health.feature")
      },
      storyManifestPath: manifestPath,
      resultPolicy: {
        allowAssumptionBasedPass: false,
        onUnsupportedScenario: "block-or-fail-with-reason",
        publishToAdo: true
      }
    });

    if (!resolveApprovedWorkbookPath(context.projectRoot, context.input)) {
      return {
        key: "executeTests",
        agentKey: "maintenance",
        status: "blocked",
        summary: "Maintenance Agent is blocked because the approved workbook could not be resolved.",
        artifactPaths: [maintenancePlanPath, artifactPath],
        nextAction: `Save the approved workbook under ${path.join(context.projectRoot, "artifacts", "generated-excel")} or provide approvedWorkbookPath explicitly before generating or running automation.`
      };
    }

    if (!fs.existsSync(manifestPath)) {
      return {
        key: "executeTests",
        agentKey: "maintenance",
        status: "blocked",
        summary: "Maintenance Agent is blocked because the story automation manifest does not exist yet.",
        artifactPaths: [maintenancePlanPath, artifactPath],
        nextAction: "Complete the automation generation stage so story-automation-manifest.json exists for this story."
      };
    }

    const execution = await executeGeneratedStory(context);
    return {
      key: "executeTests",
      agentKey: "maintenance",
      status: "completed",
      summary: `Maintenance Agent executed generated automation. Passed: ${execution.counts.passed}, Failed: ${execution.counts.failed}, Blocked: ${execution.counts.blocked}, Published: ${execution.publishedResultCount}.`,
      artifactPaths: [maintenancePlanPath, artifactPath, ...execution.artifactPaths]
    };
  },

  async publishReport(context: FlowContext): Promise<StageResult> {
    const artifactPath = path.join(context.storyArtifactsRoot, "reporting-plan.json");
    const executionRuntimePath = path.join(context.storyArtifactsRoot, "execution-runtime.json");
    const executionRuntime = fs.existsSync(executionRuntimePath)
      ? readJson<ExecutionRuntimeShape>(executionRuntimePath)
      : {};
    const reportPath = executionRuntime.allureReportDir || path.join(context.projectRoot, "artifacts", "allure-report");
    const reportIndexPath = path.join(reportPath, "index.html");
    const reportUrl = executionRuntime.allureReportUrl || "";
    writeJson(artifactPath, {
      agent: "Maintenance Agent",
      bestPractices: getFlowAgentBestPractices("maintenance"),
      runArtifactId: executionRuntime.runArtifactId || "",
      storyFolderName: executionRuntime.storyFolderName || "",
      allureReportUrl: reportUrl,
      allureReportSkipped: executionRuntime.allureReportSkipped || false,
      allureReportSkipReason: executionRuntime.allureReportSkipReason || "",
      reporters: [
        "line",
        "allure-playwright"
      ],
      expectedOutputs: [
        executionRuntime.allureResultsDir || path.join(context.projectRoot, "artifacts", "allure-results"),
        reportPath,
        executionRuntime.testOutputDir || path.join(context.projectRoot, "artifacts", "test-output"),
        path.join(context.storyArtifactsRoot, "execution-summary.json")
      ],
      runSpecificReport: true,
      failedCaseSummary: [
        "testcase ID",
        "testcase title",
        "suite ID",
        "test plan ID",
        "failed step",
        "expected result",
        "actual result",
        "error details",
        "artifact paths"
      ]
    });

    if (executionRuntime.allureReportSkipped) {
      const reason =
        executionRuntime.allureReportSkipReason ||
        "Playwright did not emit any Allure test result files for this run.";
      return {
        key: "publishReport",
        agentKey: "maintenance",
        status: "skipped",
        summary: `Maintenance Agent skipped Allure report publication because ${reason}`,
        artifactPaths: [artifactPath, executionRuntime.allureResultsDir || path.join(context.projectRoot, "artifacts", "allure-results")]
      };
    }

    if (!fs.existsSync(reportIndexPath)) {
      return {
        key: "publishReport",
        agentKey: "maintenance",
        status: "blocked",
        summary: "Maintenance Agent did not find the run-specific Allure HTML report after execution.",
        artifactPaths: [artifactPath],
        nextAction: "Run the execution stage successfully so it produces artifacts/stories/<story-folder>/runs/<runId>/allure-report/index.html."
      };
    }

    return {
      key: "publishReport",
      agentKey: "maintenance",
      status: "completed",
      summary: `Maintenance Agent confirmed the run-specific Allure HTML report is present${reportUrl ? ` and opened at ${reportUrl}` : ""}: ${reportIndexPath}`,
      artifactPaths: [artifactPath, reportPath, reportIndexPath]
    };
  }
};
