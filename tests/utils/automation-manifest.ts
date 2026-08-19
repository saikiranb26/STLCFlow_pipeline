import fs from "node:fs";
import {
  buildAutomationFeatureRelativePath,
  buildAutomationLookupTokens,
  buildAutomationScenarioKey,
  buildAutomationScenarioTitle,
  buildGeneratedSpecRelativePath
} from "./traceability";

export type AutomationStepKind =
  | "login"
  | "navigate"
  | "gotoLegacyReports"
  | "legacyReportsEnsurePaginationAvailable"
  | "legacyReportsGoToPage"
  | "legacyReportsSetPageSize"
  | "legacyReportsOpenActions"
  | "legacyReportsAssertActionsMenu"
  | "legacyReportsSelectAction"
  | "legacyReportsCompleteFolderAction"
  | "legacyReportsConfirmDelete"
  | "legacyReportsReturnToList"
  | "legacyReportsAssertRetainedState"
  | "browserBack"
  | "browserForward"
  | "clickText"
  | "fillByLabel"
  | "selectByLabel"
  | "multiSelectByLabel"
  | "checkByLabel"
  | "uncheckByLabel"
  | "fillCurrentTaskName"
  | "reopenCurrentTask"
  | "runCurrentTask"
  | "openTaskHistory"
  | "assertVisibleText"
  | "assertUrlContains"
  | "waitForText"
  | "openCreateTaskDialog"
  | "openImportTaskConfig"
  | "openDropdownByLabel"
  | "selectFirstOptionByLabel"
  | "assertSingleSelectByLabel"
  | "confirmDialog"
  | "custom";

export interface ManualWorkbookStep {
  action: string;
  expected: string;
}

export interface AutomationExecutionStep {
  kind: AutomationStepKind;
  label?: string;
  value?: string;
  target?: string;
  expected?: string;
  notes?: string;
}

export interface AutomationScenarioManifest {
  caseOrdinal: number;
  key: string;
  title: string;
  testCaseId?: number;
  tags: string[];
  featureFile: string;
  scenarioTitle: string;
  generatedSpecFile: string;
  lookupTokens: string[];
  navigationPath?: string;
  manualSteps: ManualWorkbookStep[];
  executionSteps: AutomationExecutionStep[];
}

export interface StoryAutomationManifest {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  workbookPath: string;
  generatedAt: string;
  storyFolderName?: string;
  generatedSupport?: {
    featureDir: string;
    scenarioDataDir: string;
    stepDefinitionsDir: string;
    stepDefinitionFile: string;
    pageObjectsDir: string;
    pageObjectFile: string;
    reportRunsDir: string;
  };
  scenarios: AutomationScenarioManifest[];
}

export interface StoryAutomationTraceabilityEntry {
  caseOrdinal: number;
  testCaseId?: number;
  title: string;
  scenarioKey: string;
  scenarioTitle: string;
  featureFile: string;
  generatedSpecFile: string;
  lookupTokens: string[];
}

export interface StoryAutomationTraceabilityIndex {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  generatedAt: string;
  entries: StoryAutomationTraceabilityEntry[];
}

export function readAutomationManifest(filePath: string): StoryAutomationManifest {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as StoryAutomationManifest;
}

export function normalizeScenarioTraceability(input: {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  caseOrdinal: number;
  testCaseId?: number;
  title: string;
  fallbackKey?: string;
  fallbackLabel?: string;
  featureFile?: string;
  generatedSpecFile?: string;
  tags?: string[];
  navigationPath?: string;
  manualSteps?: ManualWorkbookStep[];
  executionSteps?: AutomationExecutionStep[];
}): AutomationScenarioManifest {
  const key = buildAutomationScenarioKey(input.testCaseId, input.title, input.fallbackKey);
  const scenarioTitle = buildAutomationScenarioTitle(input.testCaseId, input.title, input.fallbackLabel);
  const featureFile =
    input.featureFile || buildAutomationFeatureRelativePath(input.workItemId, input.testCaseId, input.title, input.fallbackKey);
  const generatedSpecFile =
    input.generatedSpecFile ||
    buildGeneratedSpecRelativePath(input.workItemId, input.testCaseId, input.title, input.fallbackKey);
  const lookupTokens = buildAutomationLookupTokens({
    workItemId: input.workItemId,
    suiteId: input.suiteId,
    testPlanId: input.testPlanId,
    testCaseId: input.testCaseId,
    title: input.title
  });

  return {
    caseOrdinal: input.caseOrdinal,
    key,
    title: input.title,
    testCaseId: input.testCaseId,
    tags: input.tags || [],
    featureFile,
    scenarioTitle,
    generatedSpecFile,
    lookupTokens,
    navigationPath: input.navigationPath,
    manualSteps: input.manualSteps || [],
    executionSteps: input.executionSteps || []
  };
}

export function buildTraceabilityIndex(manifest: StoryAutomationManifest): StoryAutomationTraceabilityIndex {
  return {
    workItemId: manifest.workItemId,
    suiteId: manifest.suiteId,
    testPlanId: manifest.testPlanId,
    generatedAt: manifest.generatedAt,
    entries: manifest.scenarios.map((scenario) => ({
      caseOrdinal: scenario.caseOrdinal,
      testCaseId: scenario.testCaseId,
      title: scenario.title,
      scenarioKey: scenario.key,
      scenarioTitle: scenario.scenarioTitle,
      featureFile: scenario.featureFile,
      generatedSpecFile: scenario.generatedSpecFile,
      lookupTokens: scenario.lookupTokens
    }))
  };
}
