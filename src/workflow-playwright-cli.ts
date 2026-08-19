import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { createFlowContext } from "./orchestrator/context";
import {
  executeWorkflowStages,
  fullPlaywrightWorkflowStages,
  generateWorkflowStages,
  uploadWithoutExecutionStages,
  uploadWorkflowStages
} from "./orchestrator/stage-catalog";
import { runSelectedStages } from "./orchestrator/run-stages";
import { getExpectedWorkbookPath, getGeneratedExcelRoot } from "./orchestrator/workbook-conventions";
import type { FlowStage, StoryRunInput } from "./orchestrator/types";
import {
  getExecutionReportPath,
  printExecutionReportSummary,
  readExecutionReport
} from "./orchestrator/execution-console-summary";
import { readJson } from "./utils/fs";

interface WorkbookGenerationPlanShape {
  generatedWorkbookPath?: string;
}

interface ParsedArgs {
  storyId: number;
  suiteId: number;
  testPlanId: number;
  testCaseId?: number;
  project: string;
  navigationPath: string;
  approvedWorkbookPath: string;
  outputRoot: string;
  reviewApproved: boolean;
  generateOnly: boolean;
  uploadOnly: boolean;
  executeOnly: boolean;
  skipExecution: boolean;
  headless: boolean;
}

function readFlag(argv: string[], name: string): string | undefined {
  const direct = argv.find((item) => item.startsWith(`${name}=`));
  if (direct) {
    return direct.slice(name.length + 1);
  }

  const index = argv.findIndex((item) => item === name);
  if (index >= 0 && index < argv.length - 1) {
    return argv[index + 1];
  }

  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
}

function parseArgs(argv: string[]): ParsedArgs {
  const storyId = Number(readFlag(argv, "--story-id"));
  const suiteId = Number(readFlag(argv, "--suite-id"));
  const testPlanId = Number(readFlag(argv, "--test-plan-id"));
  const testCaseIdRaw = readFlag(argv, "--test-case-id");
  const testCaseId = testCaseIdRaw ? Number(testCaseIdRaw) : undefined;

  if (
    !Number.isFinite(storyId) ||
    !Number.isFinite(suiteId) ||
    !Number.isFinite(testPlanId) ||
    (testCaseIdRaw && !Number.isFinite(testCaseId))
  ) {
    throw new Error(
      "Usage: npm run workflow:playwright -- --story-id=<id> --suite-id=<id> --test-plan-id=<id> [--test-case-id=<id>] [--project=Cadency] [--navigation-path=\"...\"] [--approved-workbook=<path>] [--review-approved=true] [--generate-only] [--upload-only] [--execute-only] [--skip-execution] [--headless]"
    );
  }

  const generateOnly = hasFlag(argv, "--generate-only");
  const uploadOnly = hasFlag(argv, "--upload-only");
  const executeOnly = hasFlag(argv, "--execute-only");
  const modeCount = [generateOnly, uploadOnly, executeOnly].filter(Boolean).length;
  if (modeCount > 1) {
    throw new Error("Use only one of --generate-only, --upload-only, or --execute-only.");
  }

  return {
    storyId,
    suiteId,
    testPlanId,
    testCaseId,
    project: readFlag(argv, "--project") || "Cadency",
    navigationPath: readFlag(argv, "--navigation-path") || "",
    approvedWorkbookPath: readFlag(argv, "--approved-workbook") || "",
    outputRoot: readFlag(argv, "--output-root") || "",
    reviewApproved: parseBooleanFlag(readFlag(argv, "--review-approved")) || hasFlag(argv, "--review-approved"),
    generateOnly,
    uploadOnly,
    executeOnly,
    skipExecution: hasFlag(argv, "--skip-execution"),
    headless: hasFlag(argv, "--headless")
  };
}

function pickStages(args: ParsedArgs): FlowStage[] {
  if (args.generateOnly) {
    return generateWorkflowStages;
  }

  if (args.uploadOnly) {
    return uploadWorkflowStages;
  }

  if (args.executeOnly) {
    return executeWorkflowStages;
  }

  if (args.skipExecution) {
    return uploadWithoutExecutionStages;
  }

  return fullPlaywrightWorkflowStages;
}

function getPostApprovalStages(args: ParsedArgs): FlowStage[] {
  if (args.uploadOnly || args.skipExecution) {
    return uploadWorkflowStages;
  }

  if (args.executeOnly) {
    return executeWorkflowStages;
  }

  return [uploadWorkflowStages[0], uploadWorkflowStages[1], ...executeWorkflowStages.slice(1)];
}

function buildInput(projectRoot: string, args: ParsedArgs): StoryRunInput {
  return {
    workItemId: args.storyId,
    suiteId: args.suiteId,
    testPlanId: args.testPlanId,
    testCaseId: args.testCaseId,
    project: args.project,
    navigationPath: args.navigationPath,
    approvedWorkbookPath: args.approvedWorkbookPath
      ? path.resolve(projectRoot, args.approvedWorkbookPath)
      : "",
    outputRoot: args.outputRoot || "",
    reviewApproved: args.reviewApproved
  };
}

function describeMode(args: ParsedArgs): string {
  if (args.generateOnly) {
    return "generate-only";
  }
  if (args.uploadOnly) {
    return "upload-only";
  }
  if (args.executeOnly) {
    return "execute-only";
  }
  if (args.skipExecution) {
    return "generate-review-upload";
  }
  return "full";
}

function printSummary(
  summary: Awaited<ReturnType<typeof runSelectedStages>>,
  args: ParsedArgs
): void {
  console.log("");
  console.log("STLCFlow Playwright workflow finished.");
  console.log(`Mode: ${describeMode(args)}`);
  console.log(`Story: ${summary.input.workItemId}`);
  console.log(`Suite: ${summary.input.suiteId}`);
  console.log(`Plan: ${summary.input.testPlanId}`);
  console.log(`Status: ${summary.overallStatus}`);
  console.log(`State file: ${summary.stateFilePath}`);

  for (const stage of summary.stages) {
    const agentLabel = stage.agentKey ? ` [${stage.agentKey}]` : "";
    console.log(`- ${stage.key}${agentLabel}: ${stage.status} | ${stage.summary}`);
  }

  if (summary.blockedStage?.nextAction) {
    console.log(`Next action: ${summary.blockedStage.nextAction}`);
  }
}

function printExecutionDetailsIfPresent(
  projectRoot: string,
  args: ParsedArgs,
  summary: Awaited<ReturnType<typeof runSelectedStages>>
): void {
  const executedInCurrentRun = summary.stages.some((stage) => stage.key === "executeTests" && stage.status === "completed");
  if (!executedInCurrentRun) {
    return;
  }

  const reportPath = getExecutionReportPath(projectRoot, args.storyId);
  const report = readExecutionReport(reportPath);
  if (report) {
    printExecutionReportSummary(report);
  }
}

function getWorkbookGenerationPlanPath(projectRoot: string, args: ParsedArgs): string {
  const outputRoot = args.outputRoot
    ? path.resolve(projectRoot, args.outputRoot)
    : path.join(projectRoot, "artifacts", "stories");
  return path.join(outputRoot, String(args.storyId), "workbook-generation-plan.json");
}

function resolveDraftWorkbookPath(projectRoot: string, args: ParsedArgs): string {
  const generationPlanPath = getWorkbookGenerationPlanPath(projectRoot, args);
  if (fs.existsSync(generationPlanPath)) {
    try {
      const plan = readJson<WorkbookGenerationPlanShape>(generationPlanPath);
      const generatedWorkbookPath = String(plan.generatedWorkbookPath || "").trim();
      if (generatedWorkbookPath && fs.existsSync(generatedWorkbookPath)) {
        return generatedWorkbookPath;
      }
    } catch {
      // Ignore malformed artifact files and continue to fallbacks.
    }
  }

  const expectedWorkbookPath = getExpectedWorkbookPath(projectRoot, {
    workItemId: args.storyId,
    suiteId: args.suiteId,
    testPlanId: args.testPlanId,
    outputRoot: args.outputRoot
  });
  if (fs.existsSync(expectedWorkbookPath)) {
    return expectedWorkbookPath;
  }

  const generatedExcelRoot = getGeneratedExcelRoot(projectRoot, {
    workItemId: args.storyId,
    suiteId: args.suiteId,
    testPlanId: args.testPlanId,
    outputRoot: args.outputRoot
  });
  if (!fs.existsSync(generatedExcelRoot)) {
    return "";
  }

  const fuzzyMatches = fs
    .readdirSync(generatedExcelRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx") && !entry.name.startsWith("~$"))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(generatedExcelRoot, entry.name),
      mtimeMs: fs.statSync(path.join(generatedExcelRoot, entry.name)).mtimeMs
    }))
    .filter((entry) => entry.name.includes(String(args.storyId)))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return fuzzyMatches[0]?.fullPath || "";
}

function openWorkbookForReview(workbookPath: string): void {
  if (!workbookPath || !fs.existsSync(workbookPath) || process.platform !== "win32") {
    return;
  }

  spawnSync("cmd.exe", ["/d", "/s", "/c", "start", "", workbookPath], {
    stdio: "ignore",
    windowsHide: false
  });
}

function escapePowerShellLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function requestApprovalViaGui(workbookPath: string): boolean | null {
  if (process.platform !== "win32") {
    return null;
  }

  const promptText = [
    "Review the generated workbook, save any edits, then click Yes to continue.",
    "",
    workbookPath
  ].join("\n");

  const command = [
    "Add-Type -AssemblyName System.Windows.Forms",
    `$message = '${escapePowerShellLiteral(promptText).replace(/\n/g, "`n")}'`,
    "$result = [System.Windows.Forms.MessageBox]::Show($message, 'STLCFlow Review Approval', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)",
    "if ($result -eq [System.Windows.Forms.DialogResult]::Yes) { 'yes' } else { 'no' }"
  ].join("; ");

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false
  });

  if (result.status !== 0) {
    return null;
  }

  const decision = String(result.stdout || "").trim().toLowerCase();
  if (decision === "yes") {
    return true;
  }
  if (decision === "no") {
    return false;
  }

  return null;
}

async function requestApprovalViaConsole(workbookPath: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await prompt.question(
      `Review the workbook at:\n${workbookPath}\n\nApprove upload/execution and continue? (y/N): `
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    prompt.close();
  }
}

async function requestReviewApproval(
  projectRoot: string,
  args: ParsedArgs
): Promise<{ approved: boolean; workbookPath: string }> {
  const workbookPath = args.approvedWorkbookPath
    ? path.resolve(projectRoot, args.approvedWorkbookPath)
    : resolveDraftWorkbookPath(projectRoot, args);

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    console.log("Could not resolve the generated workbook for manual review.");
    return {
      approved: false,
      workbookPath: ""
    };
  }

  openWorkbookForReview(workbookPath);

  const guiDecision = requestApprovalViaGui(workbookPath);
  if (guiDecision !== null) {
    return {
      approved: guiDecision,
      workbookPath
    };
  }

  const consoleDecision = await requestApprovalViaConsole(workbookPath);
  return {
    approved: consoleDecision,
    workbookPath
  };
}

function withApprovedWorkbook(args: ParsedArgs, workbookPath: string): ParsedArgs {
  return {
    ...args,
    reviewApproved: true,
    approvedWorkbookPath: workbookPath
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const projectRoot = process.cwd();

  if (!args.headless) {
    process.env.PW_HEADLESS = "0";
  } else {
    process.env.PW_HEADLESS = "1";
  }

  const directMode = args.generateOnly || args.reviewApproved;
  if (directMode) {
    const context = createFlowContext(projectRoot, buildInput(projectRoot, args));
    const stages = pickStages(args);
    const summary = await runSelectedStages(context, stages);
    printSummary(summary, args);
    printExecutionDetailsIfPresent(projectRoot, args, summary);

    if (summary.overallStatus === "blocked") {
      process.exitCode = 2;
    }
    return;
  }

  if (args.uploadOnly || args.executeOnly) {
    const approval = await requestReviewApproval(projectRoot, args);
    if (!approval.approved) {
      console.log("Workflow cancelled because workbook approval was not granted.");
      return;
    }

    const approvedArgs = withApprovedWorkbook(args, approval.workbookPath);
    const context = createFlowContext(projectRoot, buildInput(projectRoot, approvedArgs));
    const summary = await runSelectedStages(context, pickStages(approvedArgs));
    printSummary(summary, approvedArgs);
    printExecutionDetailsIfPresent(projectRoot, approvedArgs, summary);

    if (summary.overallStatus === "blocked") {
      process.exitCode = 2;
    }
    return;
  }

  const generationContext = createFlowContext(projectRoot, buildInput(projectRoot, args));
  const generationSummary = await runSelectedStages(generationContext, generateWorkflowStages);
  if (generationSummary.overallStatus === "blocked") {
    printSummary(generationSummary, args);
    process.exitCode = 2;
    return;
  }

  const approval = await requestReviewApproval(projectRoot, args);
  if (!approval.approved) {
    printSummary(generationSummary, args);
    console.log("Workflow cancelled because workbook approval was not granted.");
    return;
  }

  const approvedArgs = withApprovedWorkbook(args, approval.workbookPath);
  const postApprovalContext = createFlowContext(projectRoot, buildInput(projectRoot, approvedArgs));
  const finalSummary = await runSelectedStages(
    postApprovalContext,
    getPostApprovalStages(approvedArgs),
    generationSummary.stages
  );
  printSummary(finalSummary, approvedArgs);
  printExecutionDetailsIfPresent(projectRoot, approvedArgs, finalSummary);

  if (finalSummary.overallStatus === "blocked") {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
