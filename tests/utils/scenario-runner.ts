import path from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { AutomationExecutionStep } from "./automation-manifest";
import { DynamicUiSupport } from "../pages/dynamic-ui";
import { ImportTaskPage } from "../pages/import-task.page";
import { LegacyReportsPage } from "../pages/legacy-reports.page";
import type { LoginPage } from "../pages/login.page";
import type { MatchShellPage } from "../pages/match-shell.page";
import { SchedulerPage } from "../pages/scheduler.page";
import { loadAutomationRuntimeConfig } from "./runtime-config";
import type { GeneratedScenarioExecutionResult, GeneratedScenarioFile } from "./generated-scenario";

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugifyScreenshotName(value: string): string {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "step"
  );
}

function shouldCaptureSuccessScreenshots(): boolean {
  return process.env.STLCFLOW_CAPTURE_SUCCESS_SCREENSHOTS !== "0";
}

export function describeGeneratedStep(step: AutomationExecutionStep): string {
  return clean(step.notes || step.target || step.label || step.expected || step.value || step.kind);
}

function isCheckboxLikeLabel(value: string): boolean {
  return /specify file names|use file pattern|perform .*validation|export records skipped|dependent upon|duplicate file checking|calendar based|file spy/i.test(
    clean(value)
  );
}

export interface GeneratedScenarioRuntimeState {
  currentTaskName: string;
  expectedLegacyPage: string;
  expectedLegacyPageSize: string;
  artifactPaths: string[];
}

export function createGeneratedScenarioRuntimeState(): GeneratedScenarioRuntimeState {
  return {
    currentTaskName: "",
    expectedLegacyPage: "",
    expectedLegacyPageSize: "",
    artifactPaths: []
  };
}

function blocked(message: string): Error {
  return new Error(message);
}

async function attachScreenshot(input: {
  page: Page;
  testInfo: TestInfo;
  fileName: string;
  attachmentName: string;
  runtimeState: GeneratedScenarioRuntimeState;
}): Promise<void> {
  try {
    const screenshotPath = input.testInfo.outputPath(input.fileName);
    await input.page.screenshot({ path: screenshotPath, fullPage: true });
    input.runtimeState.artifactPaths.push(path.relative(process.cwd(), screenshotPath));
    await input.testInfo.attach(input.attachmentName, {
      path: screenshotPath,
      contentType: "image/png"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await input.testInfo
      .attach(`${input.attachmentName} capture error`, {
        body: Buffer.from(message, "utf8"),
        contentType: "text/plain"
      })
      .catch(() => undefined);
  }
}

export async function attachGeneratedStepScreenshot(input: {
  page: Page;
  testInfo: TestInfo;
  scenarioFile: GeneratedScenarioFile;
  step: AutomationExecutionStep;
  stepIndex: number;
  status: "passed" | "failed";
  runtimeState: GeneratedScenarioRuntimeState;
}): Promise<void> {
  if (input.status === "passed" && !shouldCaptureSuccessScreenshots()) {
    return;
  }

  const stepNumber = String(input.stepIndex + 1).padStart(2, "0");
  const stepName = describeGeneratedStep(input.step);
  await attachScreenshot({
    page: input.page,
    testInfo: input.testInfo,
    fileName: `${input.scenarioFile.scenario.key}-step-${stepNumber}-${input.status}-${slugifyScreenshotName(stepName)}.png`,
    attachmentName: `generated step ${stepNumber} ${input.status}: ${stepName}`,
    runtimeState: input.runtimeState
  });
}

export async function executeGeneratedScenarioStep(input: {
  page: Page;
  loginPage: LoginPage;
  matchShellPage: MatchShellPage;
  scenarioFile: GeneratedScenarioFile;
  step: AutomationExecutionStep;
  runtimeState: GeneratedScenarioRuntimeState;
}): Promise<void> {
  const { page, loginPage, matchShellPage, scenarioFile, step, runtimeState } = input;
  const schedulerPage = new SchedulerPage(page);
  const importTaskPage = new ImportTaskPage(page);
  const runtime = loadAutomationRuntimeConfig();
  const legacyReportsPage = new LegacyReportsPage(page, runtime);
  const dynamicUi = new DynamicUiSupport(page);

  if (step.kind === "custom") {
    throw blocked(`Scenario contains an unsupported generated automation step: ${step.notes || step.kind}`);
  }

  switch (step.kind) {
    case "login":
      await loginPage.ensureAuthenticated();
      return;
    case "openImportTaskConfig":
      await loginPage.ensureAuthenticated();
      await matchShellPage.gotoScheduler();
      runtimeState.currentTaskName = `Auto_${scenarioFile.workItemId}_${Date.now()}`;
      await schedulerPage.openImportTaskConfiguration(runtimeState.currentTaskName);
      await importTaskPage.waitForLoaded();
      return;
    case "fillCurrentTaskName":
      runtimeState.currentTaskName = `Auto_${scenarioFile.workItemId}_${Date.now()}`;
      await dynamicUi.fillField(step.label || "Task name", runtimeState.currentTaskName);
      return;
    case "reopenCurrentTask":
      if (!runtimeState.currentTaskName) {
        throw blocked("Reopen step was reached before a task name was captured for this scenario.");
      }
      await schedulerPage.reopenTaskByName(runtimeState.currentTaskName);
      return;
    case "runCurrentTask":
      if (!runtimeState.currentTaskName) {
        throw blocked("Run step was reached before a task name was captured for this scenario.");
      }
      await schedulerPage.runTaskByName(runtimeState.currentTaskName);
      return;
    case "openTaskHistory":
      await matchShellPage.gotoTaskHistory();
      return;
    case "openCreateTaskDialog":
      await loginPage.ensureAuthenticated();
      await matchShellPage.gotoScheduler();
      await schedulerPage.openCreateTaskDialog();
      return;
    case "navigate": {
      const targetPath = clean(step.target || scenarioFile.scenario.navigationPath || "");
      if (!targetPath) {
        throw blocked("Navigate step is missing a navigation path or target.");
      }
      await loginPage.ensureAuthenticated();
      if (/legacy reports/i.test(targetPath)) {
        await legacyReportsPage.goto();
      } else {
        await matchShellPage.navigateByPath(targetPath);
      }
      return;
    }
    case "gotoLegacyReports":
      await loginPage.ensureAuthenticated();
      await legacyReportsPage.goto();
      return;
    case "legacyReportsEnsurePaginationAvailable":
      await legacyReportsPage.ensurePaginationAvailable();
      return;
    case "legacyReportsGoToPage":
      if (!step.value) {
        throw blocked("Legacy Reports page navigation step is missing a page number.");
      }
      runtimeState.expectedLegacyPage = clean(step.value);
      await legacyReportsPage.goToPage(runtimeState.expectedLegacyPage);
      return;
    case "legacyReportsSetPageSize":
      if (!step.value) {
        throw blocked("Legacy Reports page-size step is missing a value.");
      }
      runtimeState.expectedLegacyPageSize = await legacyReportsPage.setPageSize(step.value);
      return;
    case "legacyReportsOpenActions":
      await legacyReportsPage.openFirstRowActionsMenu();
      return;
    case "legacyReportsAssertActionsMenu": {
      const options = clean(step.notes || "Move|Duplicate|Download|Delete")
        .split("|")
        .map((item) => clean(item))
        .filter(Boolean);
      await legacyReportsPage.assertActionsMenuOptions(options);
      return;
    }
    case "legacyReportsSelectAction":
      if (!step.value) {
        throw blocked("Legacy Reports action step is missing an action name.");
      }
      await legacyReportsPage.selectAction(step.value);
      return;
    case "legacyReportsCompleteFolderAction":
      if (!step.value) {
        throw blocked("Legacy Reports folder-action step is missing a folder name.");
      }
      await legacyReportsPage.completeFolderAction(step.value);
      return;
    case "legacyReportsConfirmDelete":
      await legacyReportsPage.confirmDelete();
      return;
    case "legacyReportsReturnToList":
      await legacyReportsPage.returnToList();
      await legacyReportsPage.assertRetainedState(runtimeState.expectedLegacyPage, runtimeState.expectedLegacyPageSize);
      return;
    case "legacyReportsAssertRetainedState":
      await legacyReportsPage.assertRetainedState(runtimeState.expectedLegacyPage, runtimeState.expectedLegacyPageSize);
      return;
    case "browserBack":
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => undefined);
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
      return;
    case "browserForward":
      await page.goForward({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => undefined);
      await legacyReportsPage.assertRetainedState(runtimeState.expectedLegacyPage, runtimeState.expectedLegacyPageSize);
      return;
    case "openDropdownByLabel":
      if (!step.label) {
        throw blocked("Dropdown step is missing a label.");
      }
      if (/^task type$/i.test(step.label)) {
        await schedulerPage.openTaskTypeDropdown();
      } else {
        await importTaskPage.openDropdownByLabel(step.label);
      }
      return;
    case "selectFirstOptionByLabel":
      if (!step.label) {
        throw blocked("Select-first-option step is missing a label.");
      }
      if (/^parent task$/i.test(step.label)) {
        await schedulerPage.selectFirstParentTask();
      } else {
        await importTaskPage.selectFirstOptionByLabel(step.label);
      }
      return;
    case "assertSingleSelectByLabel":
      if (!step.label) {
        throw blocked("Single-select assertion step is missing a label.");
      }
      await importTaskPage.assertSingleSelectByLabel(step.label);
      return;
    case "confirmDialog":
      await importTaskPage.confirmDialog();
      return;
    case "clickText":
      if (!step.target) {
        throw blocked("Click step is missing a target text.");
      }
      if (/^create task$/i.test(step.target)) {
        await schedulerPage.submitCreateTaskDialog();
      } else if (/^save$/i.test(step.target)) {
        await importTaskPage.clickSave();
      } else if (/^cancel$/i.test(step.target)) {
        await importTaskPage.clickCancel();
      } else if (/^discard$/i.test(step.target)) {
        await importTaskPage.confirmDialog();
      } else if (isCheckboxLikeLabel(step.target)) {
        await importTaskPage.setCheckByLabel(step.target, true);
      } else {
        await dynamicUi.clickText(step.target, { timeoutMs: 10_000 });
      }
      return;
    case "fillByLabel":
      if (!step.label || !step.value) {
        throw blocked("Fill step is missing a label or value.");
      }
      await importTaskPage.fillByLabelValue(step.label, step.value);
      return;
    case "selectByLabel":
      if (!step.label || !step.value) {
        throw blocked("Select step is missing a label or value.");
      }
      if (/^task type$/i.test(step.label)) {
        await schedulerPage.selectTaskTypeInCreateDialog(step.value);
      } else {
        await importTaskPage.selectByLabelValue(step.label, step.value);
      }
      return;
    case "multiSelectByLabel":
      if (!step.label || !step.value) {
        throw blocked("Multi-select step is missing a label or value.");
      }
      await importTaskPage.multiSelectByLabelValues(
        step.label,
        step.value.split("|").map((item) => clean(item)).filter(Boolean)
      );
      return;
    case "checkByLabel":
    case "uncheckByLabel":
      if (!step.label) {
        throw blocked("Checkbox step is missing a label.");
      }
      if (/dependent upon the completion of another task/i.test(step.label)) {
        await schedulerPage.setDependentOnAnotherTask();
      } else {
        await importTaskPage.setCheckByLabel(step.label, step.kind === "checkByLabel");
      }
      return;
    case "assertVisibleText":
    case "waitForText":
      if (!step.expected) {
        throw blocked("Assertion step is missing expected text.");
      }
      await dynamicUi.assertVisibleText(step.expected, 10_000);
      return;
    case "assertUrlContains":
      if (!step.target) {
        throw blocked("URL assertion is missing a target fragment.");
      }
      await expect(page).toHaveURL(new RegExp(escapeRegex(step.target), "i"));
      return;
  }
}

export async function executeGeneratedScenario(input: {
  page: Page;
  testInfo: TestInfo;
  loginPage: LoginPage;
  matchShellPage: MatchShellPage;
  scenarioFile: GeneratedScenarioFile;
}): Promise<GeneratedScenarioExecutionResult> {
  const { page, testInfo, loginPage, matchShellPage, scenarioFile } = input;
  const runtimeState = createGeneratedScenarioRuntimeState();
  let currentStep: AutomationExecutionStep | undefined;
  let currentStepIndex = -1;

  try {
    await testInfo.attach("generated-scenario", {
      body: Buffer.from(JSON.stringify(scenarioFile, null, 2), "utf8"),
      contentType: "application/json"
    });

    for (let index = 0; index < scenarioFile.scenario.executionSteps.length; index += 1) {
      const step = scenarioFile.scenario.executionSteps[index];
      currentStep = step;
      currentStepIndex = index;
      await executeGeneratedScenarioStep({
        page,
        loginPage,
        matchShellPage,
        scenarioFile,
        step,
        runtimeState
      });
      await attachGeneratedStepScreenshot({
        page,
        testInfo,
        scenarioFile,
        step,
        stepIndex: index,
        status: "passed",
        runtimeState
      });
    }

    await attachScreenshot({
      page,
      testInfo,
      fileName: `${scenarioFile.scenario.key}-success.png`,
      attachmentName: "generated scenario final success",
      runtimeState
    });

    return {
      outcome: "Passed",
      comment: "Generated scenario executed successfully.",
      artifactPaths: runtimeState.artifactPaths
    };
  } catch (error) {
    if (currentStep) {
      await attachGeneratedStepScreenshot({
        page,
        testInfo,
        scenarioFile,
        step: currentStep,
        stepIndex: currentStepIndex,
        status: "failed",
        runtimeState
      });
    }
    await attachScreenshot({
      page,
      testInfo,
      fileName: `${scenarioFile.scenario.key}-failure.png`,
      attachmentName: "generated scenario final failure",
      runtimeState
    });

    const message = error instanceof Error ? error.message : String(error);
    return {
      outcome: "Failed",
      classification: "automation-issue",
      comment: message,
      failedStep: {
        step: "Generated scenario execution",
        error: message
      },
      artifactPaths: runtimeState.artifactPaths
    };
  }
}
