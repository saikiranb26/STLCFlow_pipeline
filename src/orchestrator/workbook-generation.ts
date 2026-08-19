import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { ensureDir, writeJson } from "../utils/fs";
import { getExpectedWorkbookPath } from "./workbook-conventions";
import type { FlowContext } from "./types";
import type { StoryWorkItemSnapshot } from "./ado-story";

export interface CoveragePlanShape {
  selectedReferenceSuites?: Array<{
    name: string;
    sampleCaseTitles?: string[];
    observedPatterns?: string[];
  }>;
  coverageFamilies?: string[];
}

export interface StorySummaryShape extends StoryWorkItemSnapshot {
  domain?: string;
  featureArea?: string;
}

interface WorkbookDraftStep {
  action: string;
  expected: string;
}

interface WorkbookDraftCase {
  title: string;
  steps: WorkbookDraftStep[];
  estimatedMinutes: number;
}

export interface NativeWorkbookGenerationResult {
  workbookPath: string;
  sidecarPath: string;
  totalTestCases: number;
}

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMultiline(value: string): string {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function sanitizeWorkbookTitle(value: string): string {
  return clean(value).replace(/[<>:"/\\|?*\x00-\x1F]/g, " ").trim();
}

function splitRequirementItems(rawValue: string): string[] {
  const normalized = cleanMultiline(rawValue);
  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.?!])\s+(?=[A-Z0-9-])/))
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .map((line) => line.replace(/^\d+[\).:-]\s*/, "").trim())
    .filter(Boolean);

  return Array.from(new Set(lines));
}

function buildCaseTitlePrefix(story: StorySummaryShape): string {
  const title = clean(story.title || `Work item ${story.workItemId}`);
  return title.startsWith(String(story.workItemId))
    ? title
    : `${story.workItemId} : ${title}`;
}

function inferNavigationStep(story: StorySummaryShape): WorkbookDraftStep {
  const contextText = `${story.featureArea || ""} ${story.title} ${story.areaPath} ${story.description} ${story.acceptanceCriteria}`.toLowerCase();

  if (/legacy report/.test(contextText)) {
    return {
      action: "Navigate to Match and open Legacy Reports list.",
      expected: "Legacy Reports list page is displayed."
    };
  }

  if (/recurring task|scheduler|scheduled task|task parameter/.test(contextText)) {
    return {
      action: "Navigate to Tasks and click on Scheduler tab.",
      expected: "Scheduler page is displayed."
    };
  }

  if (/task history/.test(contextText)) {
    return {
      action: "Navigate to Tasks and open Task History.",
      expected: "Task History page is displayed."
    };
  }

  if (/batch import definition/.test(contextText)) {
    return {
      action: "Navigate to Match Admin and open Batch Import Definition.",
      expected: "Batch Import Definition page is displayed."
    };
  }

  return {
    action: "Navigate to the target module for this story. Needs clarification if the exact module path differs.",
    expected: "Target page is displayed for the current story."
  };
}

function summarizeRequirement(value: string): string {
  const normalized = clean(value)
    .replace(/^verify\s+/i, "")
    .replace(/^ensure\s+/i, "")
    .replace(/^user can\s+/i, "")
    .replace(/^the user can\s+/i, "")
    .replace(/[.]+$/g, "")
    .trim();

  if (!normalized) {
    return "current story behavior";
  }

  const words = normalized.split(/\s+/).slice(0, 12);
  return words.join(" ");
}

function normalizeWorkbookPriority(value: string): string {
  const raw = clean(value).toLowerCase();
  if (raw === "1" || raw.startsWith("h")) {
    return "High";
  }
  if (raw === "3" || raw.startsWith("l")) {
    return "Low";
  }
  return "Medium";
}

interface ParsedScenario {
  title: string;
  lines: string[];
}

function parseAcceptanceScenarios(value: string): ParsedScenario[] {
  const normalized = cleanMultiline(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?=Scenario\s+\d+\s*:)/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lines = part.split("\n").map((line) => line.trim()).filter(Boolean);
      const header = lines.shift() || "";
      return {
        title: clean(header.replace(/^Scenario\s+\d+\s*:\s*/i, "")),
        lines
      };
    })
    .filter((scenario) => scenario.title);
}

function buildLegacyReportsCases(story: StorySummaryShape): WorkbookDraftCase[] {
  const prefix = buildCaseTitlePrefix(story);
  const baseSteps: WorkbookDraftStep[] = [
    { action: "Login to Match.", expected: "User is logged in successfully." },
    {
      action: "Click on Reports and select Legacy Reports.",
      expected: "Legacy Reports list view opens and the available reports are displayed."
    }
  ];

  return [
    {
      title: `${prefix} - Verify Actions menu options are displayed for a report`,
      estimatedMinutes: 5,
      steps: [
        ...baseSteps,
        {
          action: "Click Actions for any report in Legacy Reports list.",
          expected: "Move, Duplicate, Download, and Delete options are displayed."
        }
      ]
    },
    {
      title: `${prefix} - Verify page number is retained after Move action`,
      estimatedMinutes: 8,
      steps: [
        ...baseSteps,
        {
          action: "Ensure the Legacy Reports list contains enough records to navigate beyond page 1.",
          expected: "More than one page of results is available in the list."
        },
        {
          action: "Navigate to page 2 in Legacy Reports list.",
          expected: "Page 2 is displayed in the Legacy Reports list."
        },
        {
          action: "Click Actions for any report and select Move.",
          expected: "Move screen or popup loads successfully."
        },
        {
          action: "Select System folder and click Save.",
          expected: "Selected report is moved successfully and Legacy Reports list returns."
        },
        {
          action: "Verify the Legacy Reports list remains on page 2 after the Move action.",
          expected: "Legacy Reports list remains on page 2 after completing the Move action."
        }
      ]
    },
    {
      title: `${prefix} - Verify page size is retained after Duplicate action`,
      estimatedMinutes: 8,
      steps: [
        ...baseSteps,
        {
          action: "Change the page size in Legacy Reports list. Example: 25.",
          expected: "Selected page size is applied to the Legacy Reports list."
        },
        {
          action: "Click Actions for any report and select Duplicate.",
          expected: "Duplicate screen or popup loads successfully."
        },
        {
          action: "Select System folder and click Save.",
          expected: "Selected report is duplicated successfully and Legacy Reports list returns."
        },
        {
          action: "Verify the Legacy Reports list retains the selected page size after the Duplicate action.",
          expected: "Legacy Reports list retains the selected page size after completing the Duplicate action."
        }
      ]
    },
    {
      title: `${prefix} - Verify page number and page size are retained after Delete action`,
      estimatedMinutes: 8,
      steps: [
        ...baseSteps,
        {
          action: "Select a page size that still leaves more than one page of results. Example: 25.",
          expected: "Selected page size is applied and pagination beyond page 1 remains available."
        },
        {
          action: "Navigate to page 2 in Legacy Reports list.",
          expected: "Page 2 is displayed with the selected page size."
        },
        {
          action: "Click Actions for any report and select Delete.",
          expected: "Delete confirmation loads successfully."
        },
        {
          action: "Click Yes, Delete.",
          expected: "Selected report is deleted successfully and Legacy Reports list returns."
        },
        {
          action: "Verify the Legacy Reports list retains page 2 and the selected page size after the Delete action.",
          expected: "Legacy Reports list remains on page 2 with the selected page size retained after completing the Delete action."
        }
      ]
    },
    {
      title: `${prefix} - Verify current page and page size are not reset after Download action`,
      estimatedMinutes: 7,
      steps: [
        ...baseSteps,
        {
          action: "Select a page size that still leaves more than one page of results. Example: 25.",
          expected: "Selected page size is applied and pagination beyond page 1 remains available."
        },
        {
          action: "Navigate to page 2 in Legacy Reports list.",
          expected: "Page 2 is displayed with the selected page size."
        },
        {
          action: "Click Actions for any report and select Download.",
          expected: "Download action is triggered successfully."
        },
        {
          action: "Verify the Legacy Reports list remains on the same page after the download action.",
          expected: "Legacy Reports list remains on page 2 with the selected page size retained."
        }
      ]
    },
    {
      title: `${prefix} - Verify browser Back and Forward retain selected page and page size`,
      estimatedMinutes: 8,
      steps: [
        ...baseSteps,
        {
          action: "Select a page size that still leaves more than one page of results. Example: 25.",
          expected: "Selected page size is applied and pagination beyond page 1 remains available."
        },
        {
          action: "Navigate to page 3 in Legacy Reports list.",
          expected: "Page 3 is displayed with the selected page size."
        },
        {
          action: "Click the browser Back button.",
          expected: "Previous page opens successfully."
        },
        {
          action: "Click the browser Forward button.",
          expected: "Legacy Reports list opens again with page 3 and the selected page size retained."
        }
      ]
    }
  ];
}

function buildHappyPathSteps(story: StorySummaryShape, requirement: string): WorkbookDraftStep[] {
  return [
    { action: "Login to Match.", expected: "User is logged in successfully." },
    inferNavigationStep(story),
    {
      action: `Open the target flow for this story and perform the behavior described by the requirement: ${requirement}`,
      expected: "Target flow accepts the user actions required for the story."
    },
    {
      action: "Verify the saved or resulting behavior on the page.",
      expected: clean(requirement) || "Story-specific behavior is shown as expected."
    }
  ];
}

function buildValidationCase(story: StorySummaryShape, requirement: string): WorkbookDraftCase {
  return {
    title: `${buildCaseTitlePrefix(story)} - Verify ${summarizeRequirement(requirement)}`,
    estimatedMinutes: 10,
    steps: buildHappyPathSteps(story, requirement)
  };
}

function buildListViewCase(story: StorySummaryShape, coveragePlan: CoveragePlanShape): WorkbookDraftCase | null {
  const titleText = `${story.title} ${story.description} ${story.acceptanceCriteria}`.toLowerCase();
  const families = coveragePlan.coverageFamilies || [];
  const shouldCreate =
    families.some((family) => family.toLowerCase().includes("list-view")) ||
    /task parameter|list view|task results notification|sector selection/.test(titleText);

  if (!shouldCreate) {
    return null;
  }

  const lines = [
    "Fields and options relevant to the current story are displayed in the target page."
  ];

  if (/import/.test(titleText)) {
    lines.push("Import-related required fields and conditional options are displayed.");
  }

  if (/sector/.test(titleText)) {
    lines.push("Sector-related controls are displayed when applicable.");
  }

  if (/results|notification/.test(titleText)) {
    lines.push("Task results notification controls are displayed when applicable.");
  }

  return {
    title: `${buildCaseTitlePrefix(story)} - List view (Task Parameter)`,
    estimatedMinutes: 10,
    steps: [
      { action: "Login to Match.", expected: "User is logged in successfully." },
      inferNavigationStep(story),
      {
        action: "Open the target page or task configuration for this story.",
        expected: cleanMultiline(lines.join("\n"))
      }
    ]
  };
}

function buildCancelCase(story: StorySummaryShape): WorkbookDraftCase {
  return {
    title: `${buildCaseTitlePrefix(story)} - Verify cancel discards unsaved changes`,
    estimatedMinutes: 5,
    steps: [
      { action: "Login to Match.", expected: "User is logged in successfully." },
      inferNavigationStep(story),
      {
        action: "Open the target page, enter unsaved changes, and click Cancel.",
        expected: "Discard confirmation or return behavior is shown."
      },
      {
        action: "Confirm discard and return to the previous page or list.",
        expected: "Unsaved changes are not retained."
      }
    ]
  };
}

function buildChildTaskCase(story: StorySummaryShape): WorkbookDraftCase {
  return {
    title: `${buildCaseTitlePrefix(story)} - Verify child task behavior`,
    estimatedMinutes: 8,
    steps: [
      { action: "Login to Match.", expected: "User is logged in successfully." },
      inferNavigationStep(story),
      {
        action: "Create or open the parent task, then create the child task flow relevant to this story.",
        expected: "Child task configuration opens under the correct parent context."
      },
      {
        action: "Save the child task and reopen it from the scheduler list.",
        expected: "Child task remains associated to the selected parent task."
      }
    ]
  };
}

function buildDraftCases(story: StorySummaryShape, coveragePlan: CoveragePlanShape): WorkbookDraftCase[] {
  const featureAreaText = `${story.featureArea || ""} ${story.title} ${story.description}`.toLowerCase();
  if (/legacy report/.test(featureAreaText)) {
    return buildLegacyReportsCases(story);
  }

  const requirementItems = Array.from(
    new Set([
      ...splitRequirementItems(story.acceptanceCriteria),
      ...splitRequirementItems(story.reproductionSteps)
    ])
  );

  const generatedCases = requirementItems.slice(0, 8).map((item) => buildValidationCase(story, item));
  if (generatedCases.length === 0) {
    generatedCases.push(
      buildValidationCase(
        story,
        story.description || "Current story behavior requires clarification from the work item."
      )
    );
  }

  const contextText = `${story.title} ${story.description} ${story.acceptanceCriteria}`.toLowerCase();
  const extraCases: WorkbookDraftCase[] = [];

  const listViewCase = buildListViewCase(story, coveragePlan);
  if (listViewCase) {
    extraCases.push(listViewCase);
  }

  if (/cancel|discard/.test(contextText)) {
    extraCases.push(buildCancelCase(story));
  }

  if (/child task|parent task|dependent upon/.test(contextText) || story.childTasks.length > 0) {
    extraCases.push(buildChildTaskCase(story));
  }

  const caseMap = new Map<string, WorkbookDraftCase>();
  for (const testCase of [...extraCases, ...generatedCases]) {
    if (!caseMap.has(testCase.title)) {
      caseMap.set(testCase.title, testCase);
    }
  }

  return Array.from(caseMap.values());
}

function buildTimestampedWorkbookPath(workbookPath: string): string {
  const extension = path.extname(workbookPath) || ".xlsx";
  const baseName = path.basename(workbookPath, extension);
  const directory = path.dirname(workbookPath);
  return path.join(directory, `${baseName} ${Date.now()}${extension}`);
}

function writeWorkbookFile(
  templatePath: string,
  workbookPath: string,
  story: StorySummaryShape,
  cases: WorkbookDraftCase[]
): string {
  const workbook = XLSX.readFile(templatePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`Template workbook does not contain a worksheet: ${templatePath}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const existingRange = XLSX.utils.decode_range(sheet["!ref"] || "A1:J1");
  const columnCount = Math.max(existingRange.e.c, 9);
  const rowCountToClear = Math.max(existingRange.e.r, 500);

  for (let row = 1; row <= rowCountToClear; row += 1) {
    for (let col = 0; col <= columnCount; col += 1) {
      delete sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    }
  }

  const assignedTo = story.assignedTo || "";
  const state = "Design";
  const component = clean(story.component || "");
  const productRelease = clean(story.productRelease || "");
  const workbookPriority = normalizeWorkbookPriority(story.priority || "");

  const bodyRows: Array<Array<string | number>> = [];
  for (const testCase of cases) {
      bodyRows.push([
      sanitizeWorkbookTitle(testCase.title),
      "",
      "",
      assignedTo,
      state,
      productRelease,
      component,
      "Planned",
      workbookPriority,
      testCase.estimatedMinutes
    ]);

    for (const step of testCase.steps) {
      bodyRows.push(["", step.action, step.expected, "", "", "", "", "", "", ""]);
    }
  }

  XLSX.utils.sheet_add_aoa(sheet, bodyRows, { origin: "A2" });
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: bodyRows.length, c: 9 }
  });

  ensureDir(path.dirname(workbookPath));
  try {
    XLSX.writeFile(workbook, workbookPath);
    return workbookPath;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "EBUSY") {
      throw error;
    }

    const fallbackPath = buildTimestampedWorkbookPath(workbookPath);
    XLSX.writeFile(workbook, fallbackPath);
    return fallbackPath;
  }
}

export function generateWorkbookFromStoryArtifacts(
  context: FlowContext,
  templatePath: string,
  story: StorySummaryShape,
  coveragePlan: CoveragePlanShape
): NativeWorkbookGenerationResult {
  const requestedWorkbookPath = getExpectedWorkbookPath(context.projectRoot, context.input);
  const sidecarPath = path.join(
    context.storyArtifactsRoot,
    `testcases_${context.input.workItemId}_draft.sidecar.json`
  );
  const cases = buildDraftCases(story, coveragePlan);

  const workbookPath = writeWorkbookFile(templatePath, requestedWorkbookPath, story, cases);

  writeJson(sidecarPath, {
    workItemId: context.input.workItemId,
    generatedAt: new Date().toISOString(),
    storyTitle: story.title,
    caseCount: cases.length,
    selectedReferenceSuites: coveragePlan.selectedReferenceSuites || [],
    testCases: cases.map((testCase, index) => ({
      ordinal: index + 1,
      title: testCase.title,
      estimatedMinutes: testCase.estimatedMinutes,
      manualSteps: testCase.steps
    }))
  });

  return {
    workbookPath,
    sidecarPath,
    totalTestCases: cases.length
  };
}
