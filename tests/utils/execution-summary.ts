import fs from "node:fs";
import path from "node:path";

export type ExecutionClassification =
  | "product-bug"
  | "automation-issue"
  | "environment-data-issue"
  | "blocked";

export type ExecutionOutcome = "Passed" | "Failed" | "Blocked";

export interface FailedStepSummary {
  step: string;
  expected?: string;
  actual?: string;
  error?: string;
}

export interface CaseExecutionSummary {
  testCaseId?: number;
  title: string;
  suiteId?: number;
  testPlanId?: number;
  outcome: ExecutionOutcome;
  comment: string;
  classification?: ExecutionClassification;
  failedStep?: FailedStepSummary;
  artifactPaths: string[];
}

export interface ExecutionSummaryFile {
  generatedAt: string;
  workItemId?: number;
  suiteId?: number;
  testPlanId?: number;
  runId?: number;
  runCompletionWarning?: string;
  results: CaseExecutionSummary[];
  failures: CaseExecutionSummary[];
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function buildExecutionSummaryFile(input: {
  workItemId?: number;
  suiteId?: number;
  testPlanId?: number;
  runId?: number;
  runCompletionWarning?: string;
  results: CaseExecutionSummary[];
}): ExecutionSummaryFile {
  return {
    generatedAt: new Date().toISOString(),
    workItemId: input.workItemId,
    suiteId: input.suiteId,
    testPlanId: input.testPlanId,
    runId: input.runId,
    runCompletionWarning: input.runCompletionWarning,
    results: input.results,
    failures: input.results.filter((item) => item.outcome !== "Passed")
  };
}

export function writeExecutionSummary(filePath: string, summary: ExecutionSummaryFile): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
