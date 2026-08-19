import * as XLSX from "xlsx";
import type { ManualWorkbookStep } from "./automation-manifest";

export interface ParsedWorkbookTestCase {
  caseOrdinal: number;
  sourceTitle: string;
  title: string;
  manualSteps: ManualWorkbookStep[];
}

export interface ParsedApprovedWorkbook {
  workbookPath: string;
  sheetName: string;
  testCases: ParsedWorkbookTestCase[];
}

function cleanCell(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeTitleForDisplay(title: string): string {
  return cleanCell(title).replace(/\s*:\s*/g, " : ");
}

export function normalizeWorkbookTitleForLookup(title: string): string {
  return cleanCell(title)
    .replace(/^(\d{4,})\s*[:\-]\s*/u, "$1 ")
    .replace(/\s*:\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseApprovedWorkbook(workbookPath: string): ParsedApprovedWorkbook {
  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`No worksheet was found in ${workbookPath}.`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false
  });

  const cases: ParsedWorkbookTestCase[] = [];
  let currentTitle = "";
  let currentCase: ParsedWorkbookTestCase | null = null;

  for (const row of rows) {
    const titleCell = cleanCell(row["Title"]);
    const actionCell = cleanCell(row["Step Action"]);
    const resultCell = cleanCell(row["Step Result"]);

    if (titleCell) {
      currentTitle = normalizeTitleForDisplay(titleCell);
      currentCase = {
        caseOrdinal: cases.length + 1,
        sourceTitle: currentTitle,
        title: currentTitle,
        manualSteps: []
      };
      cases.push(currentCase);
    }

    if (!currentCase && currentTitle) {
      currentCase = {
        caseOrdinal: cases.length + 1,
        sourceTitle: currentTitle,
        title: currentTitle,
        manualSteps: []
      };
      cases.push(currentCase);
    }

    if (!currentCase) {
      continue;
    }

    if (actionCell || resultCell) {
      currentCase.manualSteps.push({
        action: actionCell,
        expected: resultCell
      });
    }
  }

  return {
    workbookPath,
    sheetName,
    testCases: cases.filter((item) => item.sourceTitle && item.manualSteps.length > 0)
  };
}
