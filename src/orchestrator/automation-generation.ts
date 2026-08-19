import fs from "node:fs";
import path from "node:path";
import {
  buildTraceabilityIndex,
  normalizeScenarioTraceability,
  type StoryAutomationManifest
} from "../../tests/utils/automation-manifest";
import { inferScenarioNavigationPath } from "../../tests/utils/navigation-inference";
import type { GeneratedScenarioFile } from "../../tests/utils/generated-scenario";
import {
  buildAutomationTags,
  buildAutomationScenarioKey,
  slugifyForAutomation
} from "../../tests/utils/traceability";
import { fetchSuiteCases, type AdoSuiteCase } from "../../tests/utils/ado-client";
import { inferExecutionStepsFromManualSteps, isUiScenario } from "../../tests/utils/scenario-inference";
import { normalizeWorkbookTitleForLookup, parseApprovedWorkbook } from "../../tests/utils/workbook-parser";
import { ensureDir, readJson, writeJson, writeText } from "../utils/fs";
import type { FlowContext } from "./types";
import { resolveApprovedWorkbookPath } from "./workbook-conventions";
import { getStoryFolderName, removeGeneratedStoryFolders } from "./story-folder";

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readStoryTitleForSupport(context: FlowContext): string {
  const storySummaryPath = path.join(context.storyArtifactsRoot, "story-summary.json");
  if (!fs.existsSync(storySummaryPath)) {
    return String(context.input.workItemId);
  }

  try {
    return clean(readJson<{ title?: string }>(storySummaryPath).title || "") || String(context.input.workItemId);
  } catch {
    return String(context.input.workItemId);
  }
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

function normalizeSuiteCaseMap(suiteCases: AdoSuiteCase[]): Map<string, AdoSuiteCase> {
  const map = new Map<string, AdoSuiteCase>();
  for (const suiteCase of suiteCases) {
    map.set(normalizeWorkbookTitleForLookup(suiteCase.title), suiteCase);
  }
  return map;
}

function buildManualStepCommentLines(manualSteps: Array<{ action: string; expected: string }>): string[] {
  return manualSteps.flatMap((step, index) => {
    const lines = [`  # Step ${index + 1}: ${step.action || "(no action text)"}`];
    if (step.expected) {
      lines.push(`  # Expected ${index + 1}: ${step.expected}`);
    }
    return lines;
  });
}

function storyScopedStep(text: string, _workItemId: number): string {
  return text;
}

function inferGeneratedFeatureName(title: string, navigationPath?: string): string {
  const normalizedNavigation = clean(navigationPath || "");
  if (/legacy reports/i.test(normalizedNavigation) || /legacy reports/i.test(title)) {
    return "LegacyReports";
  }

  if (/scheduler|recurring tasks|import/i.test(normalizedNavigation) || /scheduler|recurring tasks|import/i.test(title)) {
    return "Scheduler";
  }

  return "GeneratedAutomation";
}

function inferGeneratedFeatureTags(title: string, navigationPath?: string): string[] {
  const tags: string[] = [];
  const normalizedNavigation = clean(navigationPath || "");

  if (/legacy reports/i.test(normalizedNavigation) || /legacy reports/i.test(title)) {
    tags.push("@LegacyReports");
  }

  if (/scheduler|recurring tasks|import/i.test(normalizedNavigation) || /scheduler|recurring tasks|import/i.test(title)) {
    tags.push("@Scheduler");
  }

  return tags;
}

function buildBusinessGherkinSteps(
  executionSteps: StoryAutomationManifest["scenarios"][number]["executionSteps"],
  title: string,
  workItemId: number
): Array<{ keyword: "Given" | "When" | "Then" | "And"; text: string }> | null {
  const retainedStateText = (() => {
    const normalizedTitle = clean(title).toLowerCase();
    if (normalizedTitle.includes("page number and page size")) {
      return "I verify the Legacy Reports page number and page size are retained";
    }
    if (normalizedTitle.includes("page size")) {
      return "I verify the Legacy Reports page size is retained";
    }
    return "I verify the Legacy Reports page number is retained";
  })();

  const rows: Array<{ keyword: "Given" | "When" | "Then" | "And"; text: string }> = [];

  for (let index = 0; index < executionSteps.length; index += 1) {
    const step = executionSteps[index];
    const remainingKinds = executionSteps.slice(index + 1).map((item) => item.kind);
    const hasFutureRetainedAssertion = remainingKinds.includes("legacyReportsAssertRetainedState");

    switch (step.kind) {
      case "login":
        rows.push({ keyword: "Given", text: storyScopedStep("I login to Match", workItemId) });
        break;
      case "gotoLegacyReports":
        rows.push({ keyword: "When", text: storyScopedStep("I open the Legacy Reports page", workItemId) });
        break;
      case "legacyReportsEnsurePaginationAvailable":
        rows.push({ keyword: "When", text: storyScopedStep("I ensure the Legacy Reports list has more than one page", workItemId) });
        break;
      case "legacyReportsGoToPage":
        rows.push({ keyword: "When", text: storyScopedStep(`I go to page '${clean(step.value || "")}' on Legacy Reports`, workItemId) });
        break;
      case "legacyReportsSetPageSize":
        rows.push({ keyword: "When", text: storyScopedStep("I set the Legacy Reports page size to a supported value", workItemId) });
        break;
      case "legacyReportsOpenActions":
        rows.push({ keyword: "When", text: storyScopedStep("I open the Actions menu for a report on Legacy Reports", workItemId) });
        break;
      case "legacyReportsAssertActionsMenu":
        rows.push({ keyword: "Then", text: storyScopedStep("I verify the Legacy Reports Actions menu shows 'Move, Duplicate, Download, Delete'", workItemId) });
        break;
      case "legacyReportsSelectAction":
        rows.push({ keyword: "When", text: storyScopedStep(`I select the '${clean(step.value || "")}' action from the Legacy Reports Actions menu`, workItemId) });
        break;
      case "legacyReportsCompleteFolderAction":
        rows.push({ keyword: "When", text: storyScopedStep(`I choose the '${clean(step.value || "")}' folder and save the Legacy Reports action`, workItemId) });
        break;
      case "legacyReportsConfirmDelete":
        rows.push({ keyword: "When", text: storyScopedStep("I confirm the Legacy Reports delete action", workItemId) });
        break;
      case "legacyReportsReturnToList":
        rows.push({ keyword: "When", text: storyScopedStep("I return to the Legacy Reports list", workItemId) });
        if (!hasFutureRetainedAssertion) {
          rows.push({ keyword: "Then", text: storyScopedStep(retainedStateText, workItemId) });
        }
        break;
      case "legacyReportsAssertRetainedState":
        rows.push({ keyword: "Then", text: storyScopedStep(retainedStateText, workItemId) });
        break;
      case "browserBack":
        rows.push({ keyword: "When", text: storyScopedStep("I click the browser Back button", workItemId) });
        break;
      case "browserForward":
        rows.push({ keyword: "When", text: storyScopedStep("I click the browser Forward button", workItemId) });
        if (!hasFutureRetainedAssertion) {
          rows.push({ keyword: "Then", text: storyScopedStep(retainedStateText, workItemId) });
        }
        break;
      default:
        return null;
    }
  }

  return rows.length > 0 && rows.some((row) => row.keyword === "Then") ? rows : null;
}

function buildRepoStyleScenarioTitle(input: {
  workItemId: number;
  testCaseId?: number;
  title: string;
}): string {
  const titleWithoutStoryId = clean(input.title).replace(new RegExp(`^${input.workItemId}[\\s_-]+`), "");
  return input.testCaseId
    ? `${input.testCaseId}_${titleWithoutStoryId}`
    : `${input.workItemId}_${titleWithoutStoryId}`;
}

function buildScenarioTagLine(scenario: StoryAutomationManifest["scenarios"][number]): string {
  const publicScenarioTags = scenario.tags.filter((tag) => !/^@(story|suite|plan|tc)-\d+$/i.test(tag));
  const scenarioTags = Array.from(
    new Set([
      ...inferGeneratedFeatureTags(scenario.title, scenario.navigationPath),
      ...publicScenarioTags,
      ...(scenario.testCaseId ? [`@${scenario.testCaseId}`] : [])
    ])
  );

  return `  ${scenarioTags.join(" ")}`;
}

function buildGroupedScenarioBlock(
  workItemId: number,
  scenario: StoryAutomationManifest["scenarios"][number]
): string[] {
  const scenarioTitle = buildRepoStyleScenarioTitle({
    workItemId,
    testCaseId: scenario.testCaseId,
    title: scenario.title
  });
  const businessSteps = buildBusinessGherkinSteps(scenario.executionSteps, scenario.title, workItemId);
  if (businessSteps) {
    return [
      buildScenarioTagLine(scenario),
      `  Scenario: ${scenarioTitle}`,
      ...businessSteps.map((step) => `    ${step.keyword} ${step.text}`)
    ];
  }

  return [
    buildScenarioTagLine(scenario),
    `  # Source testcase title: ${scenario.title}`,
    ...buildManualStepCommentLines(scenario.manualSteps),
    `  Scenario: ${scenarioTitle}`,
    `    When ${storyScopedStep("I execute the generated scenario", workItemId)}`,
    `    Then ${storyScopedStep("the generated scenario should finish without blockers", workItemId)}`
  ];
}

function buildGroupedFeatureFileContents(manifest: StoryAutomationManifest): string {
  const featureNames = Array.from(
    new Set(manifest.scenarios.map((scenario) => inferGeneratedFeatureName(scenario.title, scenario.navigationPath)))
  );
  const featureName = featureNames.length === 1 ? featureNames[0] : `Story ${manifest.workItemId} generated automation`;
  const blocks = manifest.scenarios.flatMap((scenario) => [
    ...buildGroupedScenarioBlock(manifest.workItemId, scenario),
    ""
  ]);

  return [`Feature: ${featureName}`, "", ...blocks].join("\n");
}

function buildStoryStepDefinitionsFile(workItemId: number): string {
  return [
    `// Story-specific generated step definitions for work item ${workItemId}.`,
    'import path from "node:path";',
    'import { executeGeneratedScenario } from "../../../../utils/scenario-runner";',
    'import { readGeneratedScenarioFile, type GeneratedScenarioExecutionResult } from "../../../../utils/generated-scenario";',
    'import { Given, Then, When, test } from "../../bdd";',
    'import {',
    '  completeGeneratedScenarioRetainedStateAssertion,',
    '  ensureGeneratedScenarioLoaded,',
    '  executeExpectedGeneratedStep,',
    '  markGeneratedScenarioPassed',
    '} from "../../generated-scenario.steps";',
    "",
    'Given("the generated scenario file {string} is loaded", async ({ runtime, generatedScenarioState }, relativePath: string) => {',
    '  const absolutePath = path.join(runtime.projectRoot, relativePath);',
    '  generatedScenarioState.scenarioFile = readGeneratedScenarioFile(absolutePath);',
    '  generatedScenarioState.executionResult = undefined;',
    '  generatedScenarioState.executionCursor = 0;',
    '  generatedScenarioState.currentTaskName = "";',
    '  generatedScenarioState.expectedLegacyPage = "";',
    '  generatedScenarioState.expectedLegacyPageSize = "";',
    '  generatedScenarioState.artifactPaths = [];',
    "});",
    "",
    'When("I execute the generated scenario", async ({ runtime, storyPage, loginPage, matchShellPage, generatedScenarioState }) => {',
    "  ensureGeneratedScenarioLoaded(runtime.projectRoot, generatedScenarioState);",
    "",
    "  const testInfo = test.info();",
    "  generatedScenarioState.executionResult = await executeGeneratedScenario({",
    "    page: storyPage,",
    "    testInfo,",
    "    loginPage,",
    "    matchShellPage,",
    "    scenarioFile: generatedScenarioState.scenarioFile",
    "  });",
    "});",
    "",
    'Then("the generated scenario should finish without blockers", async ({ generatedScenarioState }) => {',
    "  const result: GeneratedScenarioExecutionResult | undefined = generatedScenarioState.executionResult;",
    "  if (!result) {",
    '    throw new Error("Generated scenario execution result is missing.");',
    "  }",
    "",
    '  if (result.outcome !== "Passed") {',
    '    const failedStep = result.failedStep?.step ? ` | Failed step: ${result.failedStep.step}` : "";',
    "    throw new Error(`${result.outcome}: ${result.comment}${failedStep}`);",
    "  }",
    "});",
    "",
    'Given("I login to Match", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["login"]',
    "  );",
    "});",
    "",
    'When("I open the Legacy Reports page", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["gotoLegacyReports"]',
    "  );",
    "});",
    "",
    'When("I ensure the Legacy Reports list has more than one page", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsEnsurePaginationAvailable"]',
    "  );",
    "});",
    "",
    'When("I go to page {string} on Legacy Reports", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsGoToPage"]',
    "  );",
    "});",
    "",
    'When("I set the Legacy Reports page size to a supported value", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsSetPageSize"]',
    "  );",
    "});",
    "",
    'When("I open the Actions menu for a report on Legacy Reports", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsOpenActions"]',
    "  );",
    "});",
    "",
    'Then("I verify the Legacy Reports Actions menu shows {string}", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsAssertActionsMenu"]',
    "  );",
    "  markGeneratedScenarioPassed(generatedScenarioState);",
    "});",
    "",
    'When("I select the {string} action from the Legacy Reports Actions menu", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsSelectAction"]',
    "  );",
    "});",
    "",
    'When("I choose the {string} folder and save the Legacy Reports action", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsCompleteFolderAction"]',
    "  );",
    "});",
    "",
    'When("I confirm the Legacy Reports delete action", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsConfirmDelete"]',
    "  );",
    "});",
    "",
    'When("I return to the Legacy Reports list", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["legacyReportsReturnToList"]',
    "  );",
    "});",
    "",
    'When("I click the browser Back button", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["browserBack"]',
    "  );",
    "});",
    "",
    'When("I click the browser Forward button", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  await executeExpectedGeneratedStep(",
    "    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '    ["browserForward"]',
    "  );",
    "});",
    "",
    'Then("I verify the Legacy Reports page number is retained", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  const scenarioFile = generatedScenarioState.scenarioFile;",
    "  const cursor = Number(generatedScenarioState.executionCursor || 0);",
    "  const nextStep = scenarioFile?.scenario.executionSteps[cursor];",
    '  if (nextStep?.kind === "legacyReportsAssertRetainedState") {',
    "    await executeExpectedGeneratedStep(",
    "      { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '      ["legacyReportsAssertRetainedState"]',
    "    );",
    "  } else {",
    "    completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState);",
    "  }",
    "  markGeneratedScenarioPassed(generatedScenarioState);",
    "});",
    "",
    'Then("I verify the Legacy Reports page size is retained", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  const scenarioFile = generatedScenarioState.scenarioFile;",
    "  const cursor = Number(generatedScenarioState.executionCursor || 0);",
    "  const nextStep = scenarioFile?.scenario.executionSteps[cursor];",
    '  if (nextStep?.kind === "legacyReportsAssertRetainedState") {',
    "    await executeExpectedGeneratedStep(",
    "      { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '      ["legacyReportsAssertRetainedState"]',
    "    );",
    "  } else {",
    "    completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState);",
    "  }",
    "  markGeneratedScenarioPassed(generatedScenarioState);",
    "});",
    "",
    'Then("I verify the Legacy Reports page number and page size are retained", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {',
    "  const scenarioFile = generatedScenarioState.scenarioFile;",
    "  const cursor = Number(generatedScenarioState.executionCursor || 0);",
    "  const nextStep = scenarioFile?.scenario.executionSteps[cursor];",
    '  if (nextStep?.kind === "legacyReportsAssertRetainedState") {',
    "    await executeExpectedGeneratedStep(",
    "      { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },",
    '      ["legacyReportsAssertRetainedState"]',
    "    );",
    "  } else {",
    "    completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState);",
    "  }",
    "  markGeneratedScenarioPassed(generatedScenarioState);",
    "});",
    ""
  ].join("\n");
}

function buildStoryPageClassFile(input: {
  workItemId: number;
  storyFolderName: string;
  storyTitle: string;
  usesLegacyReports: boolean;
}): string {
  const className = `Story${input.workItemId}Page`;
  const baseClassName = input.usesLegacyReports ? "LegacyReportsPage" : "MatchShellPage";
  const baseImport = input.usesLegacyReports ? "../../legacy-reports.page" : "../../match-shell.page";
  const storyLocatorMembers = input.usesLegacyReports
    ? [
        "",
        "  get legacyReportsHeading(): Locator {",
        "    return this.page.getByText(/legacy reports/i).first();",
        "  }",
        "",
        "  get legacyReportsDataRows(): Locator {",
        '    return this.page.locator("table tbody tr").filter({ has: this.page.locator("td") });',
        "  }",
        "",
        "  get firstLegacyReportRow(): Locator {",
        "    return this.legacyReportsDataRows.first();",
        "  }",
        "",
        "  get firstRowActionCell(): Locator {",
        '    return this.firstLegacyReportRow.locator("td, [role=\'cell\']").nth(1);',
        "  }",
        "",
        "  get firstRowActionsButton(): Locator {",
        "    return this.firstRowActionCell.getByRole(\"button\").first();",
        "  }",
        "",
        "  get firstRowActionsLink(): Locator {",
        "    return this.firstRowActionCell.getByRole(\"link\").first();",
        "  }",
        "",
        "  get itemsPerPageControl(): Locator {",
        "    return this.page.getByLabel(/items per page/i).or(this.page.locator(\"select[twid='pagination-size']\")).first();",
        "  }",
        "",
        "  get activePageIndicator(): Locator {",
        "    return this.page.locator(\".pagination .active, .pagination .current, .page-item.active, [aria-current='page']\").first();",
        "  }",
        "",
        "  get visibleDialog(): Locator {",
        "    return this.page.locator(\"[role='dialog'], [aria-modal='true'], .modal-dialog, .modal-content, .ui-dialog, .k-window-content\").last();",
        "  }",
        "",
        "  pageNumberControl(pageNumber: string): Locator {",
        "    const pagePattern = new RegExp(`^\\\\s*${this.escapeRegex(this.clean(pageNumber))}\\\\s*$`, \"i\");",
        "    return this.page.getByRole(\"link\", { name: pagePattern }).or(this.page.getByRole(\"button\", { name: pagePattern })).first();",
        "  }",
        "",
        "  actionsMenuItem(actionName: string): Locator {",
        "    const actionPattern = new RegExp(`^\\\\s*${this.escapeRegex(this.clean(actionName))}\\\\s*$`, \"i\");",
        "    return this.page.getByRole(\"menuitem\", { name: actionPattern })",
        "      .or(this.page.getByRole(\"button\", { name: actionPattern }))",
        "      .or(this.page.getByRole(\"link\", { name: actionPattern }))",
        "      .first();",
        "  }",
        "",
        "  folderCheckbox(folderName: string): Locator {",
        "    const folderPattern = new RegExp(this.escapeRegex(this.clean(folderName)), \"i\");",
        "    return this.visibleDialog.getByRole(\"checkbox\", { name: folderPattern })",
        "      .or(this.visibleDialog.getByLabel(folderPattern))",
        "      .first();",
        "  }"
      ]
    : [
        "",
        "  actionByText(label: string): Locator {",
        "    const actionPattern = new RegExp(this.escapeRegex(this.clean(label)), \"i\");",
        "    return this.page.getByRole(\"button\", { name: actionPattern })",
        "      .or(this.page.getByRole(\"link\", { name: actionPattern }))",
        "      .or(this.page.getByText(actionPattern))",
        "      .first();",
        "  }"
      ];
  return [
    'import type { Locator, Page } from "@playwright/test";',
    'import type { AutomationRuntimeConfig } from "../../../utils/runtime-config";',
    `import { ${baseClassName} } from "${baseImport}";`,
    "",
    `export class ${className} extends ${baseClassName} {`,
    `  static readonly storyId = ${input.workItemId};`,
    `  static readonly storyFolderName = ${JSON.stringify(input.storyFolderName)};`,
    `  static readonly storyTitle = ${JSON.stringify(input.storyTitle)};`,
    "",
    "  constructor(page: Page, runtime: AutomationRuntimeConfig) {",
    "    super(page, runtime);",
    "  }",
    ...storyLocatorMembers,
    "}",
    ""
  ].join("\n");
}

function findUnsupportedGeneratedSteps(scenarios: StoryAutomationManifest["scenarios"]): Array<{
  testCaseId?: number;
  title: string;
  stepIndex: number;
  notes: string;
}> {
  return scenarios.flatMap((scenario) =>
    scenario.executionSteps
      .map((step, index) => ({
        step,
        index
      }))
      .filter(({ step }) => step.kind === "custom")
      .map(({ step, index }) => ({
        testCaseId: scenario.testCaseId,
        title: scenario.title,
        stepIndex: index + 1,
        notes: step.notes || "Unsupported custom generated step"
      }))
  );
}

export interface GeneratedAutomationArtifacts {
  artifactPaths: string[];
  scenarioCount: number;
  warnings: string[];
}

interface UploadSummaryCaseMapEntry {
  ordinal: number;
  testCaseId: number;
  title: string;
}

interface UploadSummaryShape {
  createdCaseMap?: UploadSummaryCaseMapEntry[];
}

export async function generateAutomationArtifacts(context: FlowContext): Promise<GeneratedAutomationArtifacts> {
  const resolvedWorkbook = resolveApprovedWorkbookPath(context.projectRoot, context.input);
  if (!resolvedWorkbook) {
    throw new Error(
      `Approved workbook could not be resolved. Place the reviewed workbook under ${path.join(context.projectRoot, "artifacts", "generated-excel")} or provide approvedWorkbookPath explicitly.`
    );
  }
  const approvedWorkbookPath = resolvedWorkbook.path;

  const parsedWorkbook = parseApprovedWorkbook(approvedWorkbookPath);
  if (parsedWorkbook.testCases.length === 0) {
    throw new Error(`No testcase rows were found in the approved workbook: ${approvedWorkbookPath}`);
  }

  const storyAutomationRoot = path.join(context.storyArtifactsRoot, "automation");
  const legacyDraftAutomationRoot = path.join(storyAutomationRoot, "draft");
  const storyFolderName = getStoryFolderName(context);
  const generatedFeatureParentRoot = path.join(context.testsRoot, "bdd", "features", "generated");
  const generatedDataParentRoot = path.join(context.testsRoot, "data", "generated");
  const generatedStepParentRoot = path.join(context.testsRoot, "bdd", "steps", "generated");
  const generatedPageParentRoot = path.join(context.testsRoot, "pages", "generated");
  const generatedFeatureRoot = path.join(generatedFeatureParentRoot, storyFolderName);
  const generatedDataRoot = path.join(generatedDataParentRoot, storyFolderName);
  const generatedStepRoot = path.join(generatedStepParentRoot, storyFolderName);
  const generatedPageRoot = path.join(generatedPageParentRoot, storyFolderName);
  const generatedSpecRoot = path.join(
    context.projectRoot,
    ".features-gen",
    "tests",
    "bdd",
    "features",
    "generated",
    storyFolderName
  );
  const legacyGeneratedFeatureParentRoot = path.join(context.projectRoot, "automation", "features", "generated");
  const legacyGeneratedDataParentRoot = path.join(context.projectRoot, "automation", "data", "generated");
  const legacyRepoGeneratedStoryRoot = path.join(context.projectRoot, "automation", "stories", storyFolderName);
  const generationSummaryPath = path.join(storyAutomationRoot, "automation-generation-summary.json");
  const storyStepFileRelativePath = toPosixPath(path.join("tests", "bdd", "steps", "generated", storyFolderName, `story-${context.input.workItemId}.steps.ts`));
  const storyPageFileRelativePath = toPosixPath(path.join("tests", "pages", "generated", storyFolderName, `story-${context.input.workItemId}.page.ts`));
  const reportRunsRelativeDir = toPosixPath(path.relative(context.projectRoot, path.join(context.artifactsRoot, storyFolderName, "runs")));

  ensureDir(storyAutomationRoot);
  removeDirectoryIfPresent(legacyDraftAutomationRoot, storyAutomationRoot);
  removeGeneratedStoryFolders(generatedFeatureParentRoot, context.input.workItemId);
  removeGeneratedStoryFolders(generatedDataParentRoot, context.input.workItemId);
  removeGeneratedStoryFolders(generatedStepParentRoot, context.input.workItemId);
  removeGeneratedStoryFolders(generatedPageParentRoot, context.input.workItemId);
  removeGeneratedStoryFolders(path.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated"), context.input.workItemId);
  removeGeneratedStoryFolders(legacyGeneratedFeatureParentRoot, context.input.workItemId);
  removeGeneratedStoryFolders(legacyGeneratedDataParentRoot, context.input.workItemId);
  removeGeneratedStoryFolders(path.join(context.projectRoot, ".features-gen", "automation", "features", "generated"), context.input.workItemId);
  removeDirectoryIfPresent(legacyRepoGeneratedStoryRoot, path.join(context.projectRoot, "automation", "stories"));
  ensureDir(generatedFeatureRoot);
  ensureDir(generatedDataRoot);
  ensureDir(generatedStepRoot);
  ensureDir(generatedPageRoot);

  const warnings: string[] = [];
  let suiteCaseMap = new Map<string, AdoSuiteCase>();
  try {
    const suiteCases = await fetchSuiteCases(
      context.input.project || "Cadency",
      context.input.testPlanId,
      context.input.suiteId
    );
    suiteCaseMap = normalizeSuiteCaseMap(suiteCases);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Unable to fetch suite cases for traceability mapping: ${message}`);
  }

  const uploadSummaryCaseMap = new Map<string, UploadSummaryCaseMapEntry>();
  const orderedUploadedCases: UploadSummaryCaseMapEntry[] = [];
  const uploadSummaryPath = path.join(context.storyArtifactsRoot, "upload-summary.json");
  if (fs.existsSync(uploadSummaryPath)) {
    try {
      const uploadSummary = readJson<UploadSummaryShape>(uploadSummaryPath);
      for (const entry of uploadSummary.createdCaseMap || []) {
        if (!entry?.testCaseId || !entry.title) {
          continue;
        }
        orderedUploadedCases.push(entry);
        uploadSummaryCaseMap.set(normalizeWorkbookTitleForLookup(entry.title), entry);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Unable to read upload summary testcase mapping: ${message}`);
    }
  }

  if (orderedUploadedCases.length === 0) {
    throw new Error(
      `Automation generation requires the current story upload mapping. Run upload for story ${context.input.workItemId} first so upload-summary.json contains createdCaseMap entries.`
    );
  }

  const workbookCaseMap = new Map(
    parsedWorkbook.testCases.map((testCase) => [normalizeWorkbookTitleForLookup(testCase.sourceTitle), testCase] as const)
  );
  const groupedFeatureFileName = `story-${context.input.workItemId}-suite-${context.input.suiteId}.feature`;
  const groupedFeatureRelativePath = toPosixPath(path.join("tests", "bdd", "features", "generated", storyFolderName, groupedFeatureFileName));
  const groupedGeneratedSpecRelativePath = toPosixPath(path.join(".features-gen", "tests", "bdd", "features", "generated", storyFolderName, `${groupedFeatureFileName}.spec.js`));

  const missingWorkbookTitles = orderedUploadedCases
    .filter((entry) => !workbookCaseMap.has(normalizeWorkbookTitleForLookup(entry.title)))
    .map((entry) => entry.title);
  if (missingWorkbookTitles.length > 0) {
    throw new Error(
      `Approved workbook does not contain all uploaded ADO testcase titles for story ${context.input.workItemId}. Missing workbook titles: ${missingWorkbookTitles.join(" | ")}`
    );
  }

  const scenarios = orderedUploadedCases.map((uploadedCase) => {
    const testCase = workbookCaseMap.get(normalizeWorkbookTitleForLookup(uploadedCase.title));
    if (!testCase) {
      throw new Error(`Workbook testcase could not be resolved for uploaded title "${uploadedCase.title}".`);
    }

    const normalizedTitle = normalizeWorkbookTitleForLookup(testCase.sourceTitle);
    const mappedSuiteCase = suiteCaseMap.get(normalizedTitle);
    const mappedUploadCase = uploadSummaryCaseMap.get(normalizedTitle) || uploadedCase;
    const resolvedTestCaseId = mappedUploadCase.testCaseId || mappedSuiteCase?.id;
    const fallbackKey = `case-${String(testCase.caseOrdinal).padStart(3, "0")}-${slugifyForAutomation(testCase.sourceTitle) || "scenario"}`;
    const scenarioKey = buildAutomationScenarioKey(resolvedTestCaseId, testCase.sourceTitle, fallbackKey);
    const inferredNavigationPath = inferScenarioNavigationPath({
      explicitNavigationPath: context.input.navigationPath,
      title: testCase.sourceTitle,
      manualSteps: testCase.manualSteps
    });
    const executionSteps = inferExecutionStepsFromManualSteps({
      manualSteps: testCase.manualSteps,
      navigationPath: inferredNavigationPath
    });
    const uiScenario = isUiScenario(executionSteps);
    const scenario = normalizeScenarioTraceability({
      workItemId: context.input.workItemId,
      suiteId: context.input.suiteId,
      testPlanId: context.input.testPlanId,
      caseOrdinal: testCase.caseOrdinal,
      testCaseId: resolvedTestCaseId,
      title: testCase.sourceTitle,
      fallbackKey,
      featureFile: groupedFeatureRelativePath,
      generatedSpecFile: groupedGeneratedSpecRelativePath,
      fallbackLabel: `Case ${String(testCase.caseOrdinal).padStart(3, "0")}`,
      tags: buildAutomationTags({
        workItemId: context.input.workItemId,
        suiteId: context.input.suiteId,
        testPlanId: context.input.testPlanId,
        testCaseId: resolvedTestCaseId,
        extraTags: [uiScenario ? "@ui" : "@nonui", "@generated"]
      }),
      navigationPath: inferredNavigationPath,
      manualSteps: testCase.manualSteps,
      executionSteps
    });

    return scenario;
  });

  const manifest: StoryAutomationManifest = {
    workItemId: context.input.workItemId,
    suiteId: context.input.suiteId,
    testPlanId: context.input.testPlanId,
    workbookPath: approvedWorkbookPath,
    generatedAt: new Date().toISOString(),
    storyFolderName,
    generatedSupport: {
      featureDir: toPosixPath(path.join("tests", "bdd", "features", "generated", storyFolderName)),
      scenarioDataDir: toPosixPath(path.join("tests", "data", "generated", storyFolderName)),
      stepDefinitionsDir: toPosixPath(path.join("tests", "bdd", "steps", "generated", storyFolderName)),
      stepDefinitionFile: storyStepFileRelativePath,
      pageObjectsDir: toPosixPath(path.join("tests", "pages", "generated", storyFolderName)),
      pageObjectFile: storyPageFileRelativePath,
      reportRunsDir: reportRunsRelativeDir
    },
    scenarios
  };

  const unsupportedSteps = findUnsupportedGeneratedSteps(manifest.scenarios);
  if (unsupportedSteps.length > 0) {
    writeJson(generationSummaryPath, {
      workbookPath: approvedWorkbookPath,
      workbookResolutionSource: resolvedWorkbook.source,
      generationMode: "blocked-unsupported-generated-steps",
      scenarioCount: manifest.scenarios.length,
      unsupportedStepCount: unsupportedSteps.length,
      unsupportedSteps,
      nextAction:
        "Add a parser rule or shared POM method for every unsupported workbook action before generating executable automation."
    });

    throw new Error(
      `Automation generation blocked because ${unsupportedSteps.length} generated step(s) are unsupported. See ${generationSummaryPath}.`
    );
  }

  const artifactPaths: string[] = [];

  for (const scenario of manifest.scenarios) {
    const scenarioFileAbsolutePath = path.join(generatedDataRoot, `${scenario.key}.scenario.json`);
    const generatedScenarioFile: GeneratedScenarioFile = {
      workItemId: context.input.workItemId,
      suiteId: context.input.suiteId,
      testPlanId: context.input.testPlanId,
      project: context.input.project || "Cadency",
      workbookPath: approvedWorkbookPath,
      generatedAt: manifest.generatedAt,
      scenario
    };
    writeJson(scenarioFileAbsolutePath, generatedScenarioFile);
    artifactPaths.push(scenarioFileAbsolutePath);
  }

  const featureFileAbsolutePath = path.join(context.projectRoot, groupedFeatureRelativePath);
  writeText(featureFileAbsolutePath, buildGroupedFeatureFileContents(manifest));
  artifactPaths.push(featureFileAbsolutePath);

  const storyStepFileAbsolutePath = path.join(context.projectRoot, storyStepFileRelativePath);
  const storyPageFileAbsolutePath = path.join(context.projectRoot, storyPageFileRelativePath);
  const usesLegacyReports = manifest.scenarios.some((scenario) => inferGeneratedFeatureName(scenario.title, scenario.navigationPath) === "LegacyReports");
  writeText(storyStepFileAbsolutePath, buildStoryStepDefinitionsFile(context.input.workItemId));
  writeText(storyPageFileAbsolutePath, buildStoryPageClassFile({
    workItemId: context.input.workItemId,
    storyFolderName,
    storyTitle: readStoryTitleForSupport(context),
    usesLegacyReports
  }));
  artifactPaths.push(storyStepFileAbsolutePath, storyPageFileAbsolutePath);

  const manifestPath = path.join(storyAutomationRoot, "story-automation-manifest.json");
  const traceabilityIndexPath = path.join(storyAutomationRoot, "story-automation-traceability-index.json");
  const generatedFeatureTraceabilityIndexPath = path.join(generatedFeatureRoot, "story-automation-traceability-index.json");
  const generatedDataManifestPath = path.join(generatedDataRoot, "story-automation-manifest.json");
  writeJson(manifestPath, manifest);
  writeJson(traceabilityIndexPath, buildTraceabilityIndex(manifest));
  writeJson(generationSummaryPath, {
    workbookPath: approvedWorkbookPath,
    workbookResolutionSource: resolvedWorkbook.source,
    generationMode: "uploaded-ado-cases-only",
    sheetName: parsedWorkbook.sheetName,
    scenarioCount: manifest.scenarios.length,
    storyFolderName,
    generatedSupport: manifest.generatedSupport,
    uploadMappedCases: orderedUploadedCases.length,
    matchedSuiteCases: manifest.scenarios.filter((scenario) => Boolean(scenario.testCaseId)).length,
    unmatchedWorkbookCases: parsedWorkbook.testCases
      .filter((testCase) => !uploadSummaryCaseMap.has(normalizeWorkbookTitleForLookup(testCase.sourceTitle)))
      .map((testCase) => ({ caseOrdinal: testCase.caseOrdinal, title: testCase.sourceTitle })),
    warnings
  });
  writeJson(generatedFeatureTraceabilityIndexPath, buildTraceabilityIndex(manifest));
  writeJson(generatedDataManifestPath, manifest);

  artifactPaths.push(
    manifestPath,
    traceabilityIndexPath,
    generationSummaryPath,
    generatedFeatureTraceabilityIndexPath,
    generatedDataManifestPath
  );

  return {
    artifactPaths,
    scenarioCount: manifest.scenarios.length,
    warnings
  };
}
