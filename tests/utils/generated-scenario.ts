import fs from "node:fs";
import path from "node:path";
import type { AutomationScenarioManifest } from "./automation-manifest";
import type { FailedStepSummary, ExecutionClassification, ExecutionOutcome } from "./execution-summary";

export interface GeneratedScenarioFile {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  project: string;
  workbookPath: string;
  generatedAt: string;
  scenario: AutomationScenarioManifest;
}

export interface GeneratedScenarioExecutionResult {
  outcome: ExecutionOutcome;
  classification?: ExecutionClassification;
  comment: string;
  failedStep?: FailedStepSummary;
  artifactPaths: string[];
}

export interface GeneratedScenarioResultFile extends GeneratedScenarioExecutionResult {
  generatedAt: string;
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  testCaseId?: number;
  scenarioKey: string;
  scenarioTitle: string;
  title: string;
  testStatus?: string;
}

export function readGeneratedScenarioFile(filePath: string): GeneratedScenarioFile {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedScenarioFile;
}

export function getGeneratedScenarioResultsDir(projectRoot: string, workItemId: number): string {
  return path.join(projectRoot, "artifacts", "stories", String(workItemId), "automation", "execution-results");
}

export function getGeneratedScenarioResultPath(projectRoot: string, workItemId: number, scenarioKey: string): string {
  return path.join(getGeneratedScenarioResultsDir(projectRoot, workItemId), `${scenarioKey}.result.json`);
}

export function writeGeneratedScenarioResultFile(filePath: string, result: GeneratedScenarioResultFile): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

export function readGeneratedScenarioResultFile(filePath: string): GeneratedScenarioResultFile {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedScenarioResultFile;
}
