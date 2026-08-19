import fs from "node:fs";
import path from "node:path";
import { readJson } from "../utils/fs";

interface ExecutionReportShape {
  workItemId?: number;
  suiteId?: number;
  testPlanId?: number;
  testCaseId?: number;
  runId?: number;
  runArtifactId?: string;
  counts?: {
    passed?: number;
    failed?: number;
    blocked?: number;
  };
  publishedResultCount?: number;
  runArtifactsRoot?: string;
  storedAutomationPaths?: {
    manifestPath?: string;
    traceabilityIndexPath?: string;
    featureFiles?: string[];
    scenarioDataDir?: string;
    generatedSpecFiles?: string[];
    pageObjectsDir?: string;
    stepDefinitionsDir?: string;
    scenarioRunnerPath?: string;
  };
  executionArtifacts?: {
    executionSummaryPath?: string;
    adoResultPublicationPath?: string;
    executionRuntimePath?: string;
    testOutputDir?: string;
    allureResultsDir?: string;
    allureReportDir?: string;
    allureReportUrl?: string;
    allureReportSkipped?: boolean;
    allureReportSkipReason?: string;
    latestReportPath?: string;
  };
}

export function getExecutionReportPath(projectRoot: string, workItemId: number): string {
  return path.join(projectRoot, "artifacts", "stories", String(workItemId), "execution-report.json");
}

export function readExecutionReport(filePath: string): ExecutionReportShape | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  return readJson<ExecutionReportShape>(filePath);
}

function printPathList(label: string, paths: string[] | undefined): void {
  const values = (paths || []).filter(Boolean);
  if (values.length === 0) {
    return;
  }

  console.log(`${label}:`);
  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

export function printExecutionReportSummary(report: ExecutionReportShape): void {
  const counts = report.counts || {};
  const artifacts = report.executionArtifacts || {};
  const stored = report.storedAutomationPaths || {};

  console.log("");
  console.log("Automation execution summary");
  console.log(`Story: ${report.workItemId || ""}`);
  console.log(`Suite: ${report.suiteId || ""}`);
  console.log(`Plan: ${report.testPlanId || ""}`);
  if (report.testCaseId) {
    console.log(`Testcase: ${report.testCaseId}`);
  }
  if (report.runId) {
    console.log(`ADO run: ${report.runId}`);
  }
  console.log(`Passed: ${counts.passed || 0} | Failed: ${counts.failed || 0} | Blocked: ${counts.blocked || 0}`);
  console.log(`Published to ADO: ${report.publishedResultCount || 0}`);
  console.log(`Run folder: ${report.runArtifactsRoot || ""}`);
  if (artifacts.allureReportSkipped) {
    console.log(`Allure report: skipped - ${artifacts.allureReportSkipReason || "no reportable Allure test results"}`);
  } else if (artifacts.allureReportUrl) {
    console.log(`Allure report opened: ${artifacts.allureReportUrl}`);
  }
  if (!artifacts.allureReportSkipped) {
    console.log(`Allure HTML folder: ${artifacts.allureReportDir || ""}`);
  }
  console.log(`Screenshots/test output: ${artifacts.testOutputDir || ""}`);
  console.log(`Execution summary JSON: ${artifacts.executionSummaryPath || ""}`);

  console.log("");
  console.log("Stored automation");
  printPathList("Feature file(s)", stored.featureFiles);
  console.log(`Scenario data: ${stored.scenarioDataDir || ""}`);
  printPathList("Generated spec file(s)", stored.generatedSpecFiles);
  console.log(`Manifest: ${stored.manifestPath || ""}`);
  console.log(`Traceability: ${stored.traceabilityIndexPath || ""}`);
  console.log(`Page objects/POM: ${stored.pageObjectsDir || ""}`);
  console.log(`Step definitions: ${stored.stepDefinitionsDir || ""}`);
  console.log(`Scenario runner: ${stored.scenarioRunnerPath || ""}`);
}
