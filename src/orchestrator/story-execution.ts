import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { readAutomationManifest, buildTraceabilityIndex, type StoryAutomationManifest } from "../../tests/utils/automation-manifest";
import {
  completeTestRun,
  createTestRun,
  fetchSuiteCases,
  fetchSuitePoints,
  publishTestResults,
  type AdoPublishableResult,
  type AdoSuiteCase
} from "../../tests/utils/ado-client";
import {
  getGeneratedScenarioResultPath,
  getGeneratedScenarioResultsDir,
  readGeneratedScenarioResultFile,
  writeGeneratedScenarioResultFile,
  type GeneratedScenarioResultFile
} from "../../tests/utils/generated-scenario";
import { buildExecutionSummaryFile, writeExecutionSummary, type CaseExecutionSummary } from "../../tests/utils/execution-summary";
import { normalizeWorkbookTitleForLookup } from "../../tests/utils/workbook-parser";
import { readJson, writeJson } from "../utils/fs";
import type { FlowContext } from "./types";
import { getStoryFolderName, removeGeneratedStoryFolders } from "./story-folder";

export interface StoryExecutionArtifacts {
  artifactPaths: string[];
  executionSummaryPath: string;
  reportPath: string;
  executionReportPath: string;
  storyFolderName: string;
  runArtifactsRoot: string;
  runArtifactId: string;
  allureResultsDir: string;
  allureReportDir: string;
  allureReportUrl?: string;
  allureServerPort?: number;
  allureReportSkipped?: boolean;
  allureReportSkipReason?: string;
  testOutputDir: string;
  storedAutomationPaths: {
    manifestPath: string;
    traceabilityIndexPath: string;
    featureFiles: string[];
    scenarioDataDir: string;
    generatedSpecFiles: string[];
    pageObjectsDir: string;
    stepDefinitionsDir: string;
    scenarioRunnerPath: string;
  };
  counts: {
    passed: number;
    failed: number;
    blocked: number;
  };
  publishedResultCount: number;
  runId?: number;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildRunArtifactId(workItemId: number, testCaseId?: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const scope = testCaseId ? `tc-${testCaseId}` : "full";
  return `${timestamp}-${workItemId}-${scope}`;
}

function removeDirectoryIfPresent(targetPath: string, expectedRoot: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(expectedRoot);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`Refusing to remove directory outside expected root: ${resolvedTarget}`);
  }

  if (fs.existsSync(resolvedTarget)) {
    fs.rmSync(resolvedTarget, { recursive: true, force: true });
  }
}

function hasAllureTestResultFiles(resultsDir: string): boolean {
  if (!fs.existsSync(resultsDir)) {
    return false;
  }

  for (const entry of fs.readdirSync(resultsDir, { withFileTypes: true })) {
    const entryPath = path.join(resultsDir, entry.name);
    if (entry.isDirectory() && hasAllureTestResultFiles(entryPath)) {
      return true;
    }

    if (entry.isFile() && entry.name.endsWith("-result.json")) {
      return true;
    }
  }

  return false;
}

function getNpxCommand(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"&<>|^]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

async function runCommand(command: string, args: string[], cwd: string, extraEnv: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ...extraEnv
    };
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")], {
            cwd,
            env,
            stdio: "inherit"
          })
        : spawn(command, args, {
            cwd,
            env,
            stdio: "inherit"
          });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function generateAllureReport(projectRoot: string, resultsDir: string, reportDir: string): Promise<number> {
  const allureCli = path.join(projectRoot, "node_modules", "allure", "cli.js");
  if (!fs.existsSync(allureCli)) {
    throw new Error(`Allure CLI was not found: ${allureCli}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [allureCli, "generate", resultsDir, "--output", reportDir], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
      windowsHide: true
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function canListenOnPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(host: string, startPort = 9323): Promise<number> {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await canListenOnPort(host, port)) {
      return port;
    }
  }

  throw new Error(`Unable to find an available local port from ${startPort} to ${startPort + 99}.`);
}

function waitForHttpOk(url: string, timeoutMs = 5_000): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode || 0) >= 200 && (response.statusCode || 0) < 400) {
          resolve();
          return;
        }

        retry();
      });

      request.on("error", retry);
      request.setTimeout(1_000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = (): void => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for Allure report server: ${url}`));
        return;
      }
      setTimeout(attempt, 250);
    };

    attempt();
  });
}

async function launchAllureReportServer(projectRoot: string, reportDir: string): Promise<{ url: string; port: number }> {
  const host = "127.0.0.1";
  const port = await findAvailablePort(host);
  const serverScript = path.join(projectRoot, "scripts", "serve-allure-report.js");
  const child = spawn(process.execPath, [serverScript, "--root", reportDir, "--port", String(port), "--host", host], {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore",
    shell: false,
    windowsHide: true
  });
  child.unref();

  const url = `http://${host}:${port}/`;
  await waitForHttpOk(`${url}summary.json`);
  return { url, port };
}

function openUrlInBrowser(url: string): void {
  if (process.env.CI === "true" || process.env.STLCFLOW_OPEN_ALLURE_REPORT === "0") {
    return;
  }

  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", "start", "", url], {
          detached: true,
          stdio: "ignore",
          windowsHide: false
        })
      : process.platform === "darwin"
        ? spawn("open", [url], {
            detached: true,
            stdio: "ignore"
          })
        : spawn("xdg-open", [url], {
            detached: true,
            stdio: "ignore"
          });

  child.on("error", () => undefined);
  child.unref();
}

function buildStoredAutomationPaths(
  context: FlowContext,
  manifest: StoryAutomationManifest,
  manifestPath: string
): StoryExecutionArtifacts["storedAutomationPaths"] {
  const generatedSupport = manifest.generatedSupport;
  return {
    manifestPath,
    traceabilityIndexPath: path.join(path.dirname(manifestPath), "story-automation-traceability-index.json"),
    featureFiles: Array.from(new Set(manifest.scenarios.map((scenario) => path.join(context.projectRoot, scenario.featureFile)))),
    scenarioDataDir: generatedSupport?.scenarioDataDir
      ? path.join(context.projectRoot, generatedSupport.scenarioDataDir)
      : path.join(context.projectRoot, "tests", "data", "generated", String(context.input.workItemId)),
    generatedSpecFiles: Array.from(new Set(manifest.scenarios.map((scenario) => path.join(context.projectRoot, scenario.generatedSpecFile)))),
    pageObjectsDir: generatedSupport?.pageObjectsDir
      ? path.join(context.projectRoot, generatedSupport.pageObjectsDir)
      : path.join(context.projectRoot, "tests", "pages"),
    stepDefinitionsDir: generatedSupport?.stepDefinitionsDir
      ? path.join(context.projectRoot, generatedSupport.stepDefinitionsDir)
      : path.join(context.projectRoot, "tests", "bdd", "steps"),
    scenarioRunnerPath: path.join(context.projectRoot, "tests", "utils", "scenario-runner.ts")
  };
}

function toCounts(results: CaseExecutionSummary[]): { passed: number; failed: number; blocked: number } {
  return {
    passed: results.filter((item) => item.outcome === "Passed").length,
    failed: results.filter((item) => item.outcome === "Failed").length,
    blocked: results.filter((item) => item.outcome === "Blocked").length
  };
}

function mapGeneratedResultToCaseSummary(result: GeneratedScenarioResultFile): CaseExecutionSummary {
  return {
    testCaseId: result.testCaseId,
    title: result.title,
    suiteId: result.suiteId,
    testPlanId: result.testPlanId,
    outcome: result.outcome,
    comment: result.comment,
    classification: result.classification,
    failedStep: result.failedStep,
    artifactPaths: result.artifactPaths
  };
}

function normalizeSuiteCaseMap(suiteCases: AdoSuiteCase[]): Map<string, AdoSuiteCase> {
  const map = new Map<string, AdoSuiteCase>();
  for (const suiteCase of suiteCases) {
    map.set(normalizeWorkbookTitleForLookup(suiteCase.title), suiteCase);
  }
  return map;
}

function validateManifestIdentity(context: FlowContext, manifest: StoryAutomationManifest): void {
  if (manifest.workItemId !== context.input.workItemId) {
    throw new Error(
      `Execution manifest/story mismatch. Manifest story ${manifest.workItemId} does not match current story ${context.input.workItemId}.`
    );
  }

  if (manifest.suiteId !== context.input.suiteId) {
    throw new Error(
      `Execution manifest/suite mismatch. Manifest suite ${manifest.suiteId} does not match current suite ${context.input.suiteId}.`
    );
  }

  if (manifest.testPlanId !== context.input.testPlanId) {
    throw new Error(
      `Execution manifest/plan mismatch. Manifest plan ${manifest.testPlanId} does not match current plan ${context.input.testPlanId}.`
    );
  }
}

function validateManifestAgainstSuite(context: FlowContext, manifest: StoryAutomationManifest, suiteCases: AdoSuiteCase[]): void {
  const suiteCaseMap = normalizeSuiteCaseMap(suiteCases);
  const manifestTitles = manifest.scenarios.map((scenario) => normalizeWorkbookTitleForLookup(scenario.title));
  const matchedTitles = manifestTitles.filter((title) => suiteCaseMap.has(title));

  if (manifestTitles.length === 0) {
    throw new Error("Execution manifest contains no scenarios.");
  }

  if (matchedTitles.length === 0) {
    throw new Error(
      `Execution suite mismatch. None of the generated scenarios for story ${context.input.workItemId} match titles in suite ${context.input.suiteId}.`
    );
  }

  if (matchedTitles.length !== manifestTitles.length) {
    const missing = manifest.scenarios
      .filter((scenario) => !suiteCaseMap.has(normalizeWorkbookTitleForLookup(scenario.title)))
      .map((scenario) => scenario.title);
    throw new Error(
      `Execution manifest does not fully match the uploaded ADO suite for story ${context.input.workItemId}. Missing titles: ${missing.join(" | ")}`
    );
  }
}

function validateManifestAgainstUploadSummary(context: FlowContext, manifest: StoryAutomationManifest): void {
  const uploadSummaryPath = path.join(context.storyArtifactsRoot, "upload-summary.json");
  if (!fs.existsSync(uploadSummaryPath)) {
    throw new Error(`Upload summary was not found for story ${context.input.workItemId}.`);
  }

  const uploadSummary = readJson<{ createdCaseMap?: Array<{ testCaseId: number; title: string }> }>(uploadSummaryPath);
  const uploadedCases = (uploadSummary.createdCaseMap || []).filter((entry) => entry?.testCaseId && entry?.title);
  if (uploadedCases.length === 0) {
    throw new Error(`Upload summary for story ${context.input.workItemId} does not contain uploaded testcase mappings.`);
  }

  const manifestIds = new Set(manifest.scenarios.map((scenario) => scenario.testCaseId).filter((value): value is number => Number.isFinite(value)));
  const uploadedIds = new Set(uploadedCases.map((entry) => entry.testCaseId));

  if (manifestIds.size !== uploadedIds.size) {
    throw new Error(
      `Execution manifest/upload mismatch. Manifest has ${manifestIds.size} testcase IDs but upload summary has ${uploadedIds.size}.`
    );
  }

  for (const uploadedCase of uploadedCases) {
    if (!manifestIds.has(uploadedCase.testCaseId)) {
      throw new Error(
        `Execution manifest/upload mismatch. Uploaded testcase ${uploadedCase.testCaseId} (${uploadedCase.title}) is missing from the execution manifest.`
      );
    }
  }
}

function selectTargetScenarios(context: FlowContext, manifest: StoryAutomationManifest): StoryAutomationManifest["scenarios"] {
  if (!context.input.testCaseId) {
    return manifest.scenarios;
  }

  const matching = manifest.scenarios.filter((scenario) => scenario.testCaseId === context.input.testCaseId);
  if (matching.length === 0) {
    throw new Error(
      `Execution testcase mismatch. Testcase ${context.input.testCaseId} was not found in the current story manifest for story ${context.input.workItemId}.`
    );
  }

  return matching;
}

async function enrichManifestWithSuiteIds(context: FlowContext, manifestPath: string): Promise<StoryAutomationManifest> {
  const manifest = readAutomationManifest(manifestPath);
  validateManifestIdentity(context, manifest);
  validateManifestAgainstUploadSummary(context, manifest);
  const suiteCases = await fetchSuiteCases(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
  validateManifestAgainstSuite(context, manifest, suiteCases);
  const suiteCaseMap = normalizeSuiteCaseMap(suiteCases);

  let changed = false;
  for (const scenario of manifest.scenarios) {
    if (scenario.testCaseId) {
      continue;
    }

    const mapped = suiteCaseMap.get(normalizeWorkbookTitleForLookup(scenario.title));
    if (!mapped) {
      continue;
    }

    scenario.testCaseId = mapped.id;
    if (!scenario.tags.includes(`@tc-${mapped.id}`)) {
      scenario.tags.push(`@tc-${mapped.id}`);
    }
    if (!scenario.lookupTokens.includes(String(mapped.id))) {
      scenario.lookupTokens.unshift(String(mapped.id), `tc:${mapped.id}`);
      scenario.lookupTokens = Array.from(new Set(scenario.lookupTokens));
    }
    changed = true;
  }

  if (changed) {
    writeJson(manifestPath, manifest);
    writeJson(path.join(path.dirname(manifestPath), "story-automation-traceability-index.json"), buildTraceabilityIndex(manifest));
  }

  return manifest;
}

function buildFallbackResult(context: FlowContext, manifest: StoryAutomationManifest, scenarioKey: string): GeneratedScenarioResultFile {
  const scenario = manifest.scenarios.find((item) => item.key === scenarioKey);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioKey} was not found in manifest.`);
  }

  return {
    generatedAt: new Date().toISOString(),
    workItemId: context.input.workItemId,
    suiteId: context.input.suiteId,
    testPlanId: context.input.testPlanId,
    testCaseId: scenario.testCaseId,
    scenarioKey: scenario.key,
    scenarioTitle: scenario.scenarioTitle,
    title: scenario.title,
    testStatus: "missing",
    outcome: "Failed",
    classification: "automation-issue",
    comment: "No execution result file was produced for this generated scenario.",
    artifactPaths: []
  };
}

function collectFailureArtifacts(rootDir: string, projectRoot: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const supportedExtensions = new Set([".md", ".png", ".txt", ".webm", ".zip"]);
  const artifactPaths: string[] = [];
  const visit = (dirPath: string): void => {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }

      if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
        artifactPaths.push(path.relative(projectRoot, fullPath));
      }
    }
  };

  visit(rootDir);
  return artifactPaths.sort();
}

function extractFirstFailureMessage(rootDir: string): string {
  const fallbackMessage = "Playwright failed before generated scenario steps were executed.";
  if (!fs.existsSync(rootDir)) {
    return fallbackMessage;
  }

  const contextFiles: string[] = [];
  const visit = (dirPath: string): void => {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.name.toLowerCase() === "error-context.md") {
        contextFiles.push(fullPath);
      }
    }
  };

  visit(rootDir);
  const firstContext = contextFiles.sort()[0];
  if (!firstContext) {
    return fallbackMessage;
  }

  const contents = fs.readFileSync(firstContext, "utf8");
  const errorMatch = contents.match(/Error:\s*([^\r\n]+)/);
  return errorMatch?.[1]?.trim() || fallbackMessage;
}

function writeScenarioResult(context: FlowContext, result: GeneratedScenarioResultFile): void {
  writeGeneratedScenarioResultFile(
    getGeneratedScenarioResultPath(context.projectRoot, context.input.workItemId, result.scenarioKey),
    result
  );
}

function loadScenarioResults(
  context: FlowContext,
  manifest: StoryAutomationManifest,
  targetScenarios: StoryAutomationManifest["scenarios"]
): GeneratedScenarioResultFile[] {
  return targetScenarios.map((scenario) => {
    const filePath = getGeneratedScenarioResultPath(context.projectRoot, context.input.workItemId, scenario.key);
    if (!fs.existsSync(filePath)) {
      const fallback = buildFallbackResult(context, manifest, scenario.key);
      writeScenarioResult(context, fallback);
      return fallback;
    }

    return readGeneratedScenarioResultFile(filePath);
  });
}

function markPreScenarioFailures(
  context: FlowContext,
  scenarioResults: GeneratedScenarioResultFile[],
  testOutputDir: string
): GeneratedScenarioResultFile[] {
  const failureMessage = extractFirstFailureMessage(testOutputDir);
  const artifactPaths = collectFailureArtifacts(testOutputDir, context.projectRoot);

  return scenarioResults.map((result) => {
    if (result.testStatus !== "missing") {
      return result;
    }

    const blockedResult: GeneratedScenarioResultFile = {
      ...result,
      generatedAt: new Date().toISOString(),
      testStatus: "pre-scenario-failed",
      outcome: "Blocked",
      classification: "environment-data-issue",
      comment: `Execution did not reach generated scenario steps. ${failureMessage}`,
      failedStep: {
        step: "Before hook / authentication bootstrap",
        error: failureMessage
      },
      artifactPaths
    };
    writeScenarioResult(context, blockedResult);
    return blockedResult;
  });
}

export async function executeGeneratedStory(context: FlowContext): Promise<StoryExecutionArtifacts> {
  const manifestPath = path.join(context.storyArtifactsRoot, "automation", "story-automation-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Story automation manifest was not found: ${manifestPath}`);
  }
  const manifest = await enrichManifestWithSuiteIds(context, manifestPath);
  const skipAdoPublish = process.env.STLCFLOW_SKIP_ADO_PUBLISH === "1";
  const runArtifactId = buildRunArtifactId(context.input.workItemId, context.input.testCaseId);
  const storyFolderName = manifest.storyFolderName || getStoryFolderName(context);
  const storyReportRoot = path.join(context.artifactsRoot, storyFolderName);
  const runArtifactsRoot = path.join(storyReportRoot, "runs", runArtifactId);
  const allureResultsDir = path.join(runArtifactsRoot, "allure-results");
  const allureReportDir = path.join(runArtifactsRoot, "allure-report");
  const testOutputDir = path.join(runArtifactsRoot, "test-output");

  const executionResultsDir = getGeneratedScenarioResultsDir(context.projectRoot, context.input.workItemId);
  removeDirectoryIfPresent(executionResultsDir, path.join(context.projectRoot, "artifacts", "stories"));
  ensureDir(executionResultsDir);
  ensureDir(runArtifactsRoot);
  ensureDir(allureResultsDir);
  ensureDir(testOutputDir);
  removeGeneratedStoryFolders(path.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated"), context.input.workItemId);
  removeGeneratedStoryFolders(path.join(context.projectRoot, ".features-gen", "automation", "features", "generated"), context.input.workItemId);

  const targetScenarios = selectTargetScenarios(context, manifest);
  const storedAutomationPaths = buildStoredAutomationPaths(context, manifest, manifestPath);

  const bddgenExitCode = await runCommand(getNpxCommand(), ["bddgen"], context.projectRoot);
  if (bddgenExitCode !== 0) {
    throw new Error(`BDD generation failed with exit code ${bddgenExitCode}.`);
  }

  const targetSpecFiles = Array.from(
    new Set(targetScenarios.map((scenario) => scenario.generatedSpecFile).filter(Boolean))
  ).map((specFile) => path.normalize(specFile).replace(/\\/g, "/"));
  const playwrightArgs = ["playwright", "test", ...targetSpecFiles];
  if (context.input.testCaseId) {
    playwrightArgs.push("--grep", `@${context.input.testCaseId}`);
  }
  const playwrightExitCode = await runCommand(
    getNpxCommand(),
    playwrightArgs,
    context.projectRoot,
    {
      PW_HEADLESS: process.env.PW_HEADLESS || "1",
      STLCFLOW_ALLURE_RESULTS_DIR: allureResultsDir,
      STLCFLOW_TEST_OUTPUT_DIR: testOutputDir
    }
  );

  let scenarioResults = loadScenarioResults(context, manifest, targetScenarios);
  if (playwrightExitCode !== 0 && scenarioResults.every((item) => item.testStatus === "missing")) {
    scenarioResults = markPreScenarioFailures(context, scenarioResults, testOutputDir);
  }
  const caseSummaries = scenarioResults.map(mapGeneratedResultToCaseSummary);
  const counts = toCounts(caseSummaries);

  let runId: number | undefined;
  let runCompletionWarning: string | undefined;
  let publishedResultCount = 0;

  const publishable = scenarioResults.filter((item) => item.testCaseId);
  if (!skipAdoPublish && publishable.length > 0) {
    const suiteCases = await fetchSuiteCases(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
    const suitePoints = await fetchSuitePoints(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
    const executablePointIds = suitePoints
      .filter((point) => publishable.some((item) => item.testCaseId === point.testCaseId))
      .map((point) => point.pointId);

    if (executablePointIds.length > 0) {
      const run = await createTestRun(
        context.input.project || "Cadency",
        context.input.testPlanId,
        context.input.suiteId,
        executablePointIds,
        context.input.workItemId
      );
      runId = run.runId;

      const published = await publishTestResults(
        run.runId,
        context.input.project || "Cadency",
        suiteCases,
        suitePoints,
        publishable.map(
          (item): AdoPublishableResult => ({
            testCaseId: item.testCaseId as number,
            title: item.title,
            outcome: item.outcome,
            comment: item.comment,
            errorMessage: item.failedStep?.error,
            stackTrace: item.failedStep?.actual
          })
        )
      );
      publishedResultCount = published.length;

      runCompletionWarning =
        (await completeTestRun(
          run.runId,
          context.input.project || "Cadency",
          `STLCFlow execution completed. Passed: ${counts.passed}. Failed: ${counts.failed}. Blocked: ${counts.blocked}.`
        )) || undefined;
    }
  }

  const executionSummary = buildExecutionSummaryFile({
    workItemId: context.input.workItemId,
    suiteId: context.input.suiteId,
    testPlanId: context.input.testPlanId,
    runId,
    runCompletionWarning,
    results: caseSummaries
  });
  const executionSummaryPath = path.join(context.storyArtifactsRoot, "execution-summary.json");
  const runExecutionSummaryPath = path.join(runArtifactsRoot, "execution-summary.json");
  writeExecutionSummary(executionSummaryPath, executionSummary);
  writeExecutionSummary(runExecutionSummaryPath, executionSummary);

  const publicationSummaryPath = path.join(context.storyArtifactsRoot, "ado-result-publication.json");
  const publicationSummary = {
    project: context.input.project || "Cadency",
    testPlanId: context.input.testPlanId,
    suiteId: context.input.suiteId,
    runId,
    skippedPublish: skipAdoPublish,
    publishedResultCount,
    unpublishedScenarioCount: scenarioResults.filter((item) => !item.testCaseId).length,
    runCompletionWarning
  };
  const runPublicationSummaryPath = path.join(runArtifactsRoot, "ado-result-publication.json");
  writeJson(publicationSummaryPath, publicationSummary);
  writeJson(runPublicationSummaryPath, publicationSummary);

  const executionRuntimePath = path.join(context.storyArtifactsRoot, "execution-runtime.json");
  const executionRuntime: {
    runArtifactId: string;
    storyFolderName: string;
    runArtifactsRoot: string;
    manifestPath: string;
    allureResultsDir: string;
    allureReportDir: string;
    allureReportUrl?: string;
    allureServerPort?: number;
    allureReportSkipped?: boolean;
    allureReportSkipReason?: string;
    testOutputDir: string;
    playwrightExitCode: number;
    counts: { passed: number; failed: number; blocked: number };
    storedAutomationPaths: StoryExecutionArtifacts["storedAutomationPaths"];
  } = {
    runArtifactId,
    storyFolderName,
    runArtifactsRoot,
    manifestPath,
    allureResultsDir,
    allureReportDir,
    testOutputDir,
    playwrightExitCode,
    counts,
    storedAutomationPaths
  };
  const runExecutionRuntimePath = path.join(runArtifactsRoot, "execution-runtime.json");
  writeJson(executionRuntimePath, executionRuntime);
  writeJson(runExecutionRuntimePath, executionRuntime);

  const latestReportPath = path.join(context.projectRoot, "artifacts", "latest-allure-report.json");
  let allureReportUrl: string | undefined;
  let allureServerPort: number | undefined;
  let allureReportSkipped = false;
  let allureReportSkipReason: string | undefined;

  if (hasAllureTestResultFiles(allureResultsDir)) {
    removeDirectoryIfPresent(allureReportDir, runArtifactsRoot);
    const reportExitCode = await generateAllureReport(context.projectRoot, allureResultsDir, allureReportDir);
    if (reportExitCode !== 0) {
      throw new Error(`Allure report generation failed with exit code ${reportExitCode}.`);
    }

    const launchedReport = await launchAllureReportServer(context.projectRoot, allureReportDir);
    openUrlInBrowser(launchedReport.url);
    allureReportUrl = launchedReport.url;
    allureServerPort = launchedReport.port;
    executionRuntime.allureReportUrl = launchedReport.url;
    executionRuntime.allureServerPort = launchedReport.port;
    writeJson(latestReportPath, {
      generatedAt: new Date().toISOString(),
      workItemId: context.input.workItemId,
      storyFolderName,
      suiteId: context.input.suiteId,
      testPlanId: context.input.testPlanId,
      testCaseId: context.input.testCaseId,
      runId,
      runArtifactId,
      runArtifactsRoot,
      allureResultsDir,
      allureReportDir,
      allureReportUrl: launchedReport.url,
      allureServerPort: launchedReport.port,
      indexHtmlPath: path.join(allureReportDir, "index.html"),
      serveCommand: `npm run automation:report:serve -- --root="${allureReportDir}"`
    });
  } else {
    removeDirectoryIfPresent(allureReportDir, runArtifactsRoot);
    allureReportSkipped = true;
    allureReportSkipReason =
      "Playwright did not emit any Allure test result files, so no generated scenario steps actually ran.";
    executionRuntime.allureReportSkipped = true;
    executionRuntime.allureReportSkipReason = allureReportSkipReason;
    writeJson(latestReportPath, {
      generatedAt: new Date().toISOString(),
      workItemId: context.input.workItemId,
      storyFolderName,
      suiteId: context.input.suiteId,
      testPlanId: context.input.testPlanId,
      testCaseId: context.input.testCaseId,
      runId,
      runArtifactId,
      runArtifactsRoot,
      allureResultsDir,
      allureReportDir,
      allureReportSkipped: true,
      allureReportSkipReason
    });
  }
  writeJson(executionRuntimePath, executionRuntime);
  writeJson(runExecutionRuntimePath, executionRuntime);

  const executionReportPath = path.join(context.storyArtifactsRoot, "execution-report.json");
  const runExecutionReportPath = path.join(runArtifactsRoot, "execution-report.json");
  const executionReport = {
    generatedAt: new Date().toISOString(),
    workItemId: context.input.workItemId,
    suiteId: context.input.suiteId,
    testPlanId: context.input.testPlanId,
    testCaseId: context.input.testCaseId,
    runId,
    runArtifactId,
    counts,
    publishedResultCount,
    skippedAdoPublish: skipAdoPublish,
    runArtifactsRoot,
    storedAutomationPaths,
    executionArtifacts: {
      executionSummaryPath,
      adoResultPublicationPath: publicationSummaryPath,
      executionRuntimePath,
      testOutputDir,
      allureResultsDir,
      allureReportDir,
      allureReportUrl,
      allureReportSkipped,
      allureReportSkipReason,
      latestReportPath
    },
    results: caseSummaries.map((item) => ({
      testCaseId: item.testCaseId,
      title: item.title,
      outcome: item.outcome,
      classification: item.classification,
      failedStep: item.failedStep,
      artifactPaths: item.artifactPaths
    }))
  };
  writeJson(executionReportPath, executionReport);
  writeJson(runExecutionReportPath, executionReport);

  return {
    artifactPaths: [
      executionSummaryPath,
      runExecutionSummaryPath,
      publicationSummaryPath,
      runPublicationSummaryPath,
      executionRuntimePath,
      runExecutionRuntimePath,
      executionReportPath,
      runExecutionReportPath,
      latestReportPath,
      ...(allureReportSkipped ? [] : [allureReportDir])
    ],
    executionSummaryPath,
    reportPath: allureReportDir,
    executionReportPath,
    storyFolderName,
    runArtifactsRoot,
    runArtifactId,
    allureResultsDir,
    allureReportDir,
    allureReportUrl,
    allureServerPort,
    allureReportSkipped,
    allureReportSkipReason,
    testOutputDir,
    storedAutomationPaths,
    counts,
    publishedResultCount,
    runId
  };
}
