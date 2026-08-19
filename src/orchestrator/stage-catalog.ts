import type { FlowStage } from "./types";
import { loadReferencesStage } from "./stages/load-references";
import { analyzeStoryStage } from "./stages/analyze-story";
import { collectEvidenceStage } from "./stages/collect-evidence";
import { generateWorkbookStage } from "./stages/generate-workbook";
import { reviewGateStage } from "./stages/review-gate";
import { uploadToAdoStage } from "./stages/upload-to-ado";
import { generateAutomationStage } from "./stages/generate-automation";
import { executeTestsStage } from "./stages/execute-tests";
import { publishReportStage } from "./stages/publish-report";

export const fullPlaywrightWorkflowStages: FlowStage[] = [
  loadReferencesStage,
  analyzeStoryStage,
  collectEvidenceStage,
  generateWorkbookStage,
  reviewGateStage,
  uploadToAdoStage,
  generateAutomationStage,
  executeTestsStage,
  publishReportStage
];

export const generateWorkflowStages: FlowStage[] = [
  loadReferencesStage,
  analyzeStoryStage,
  collectEvidenceStage,
  generateWorkbookStage
];

export const uploadWorkflowStages: FlowStage[] = [
  reviewGateStage,
  uploadToAdoStage
];

export const executeWorkflowStages: FlowStage[] = [
  reviewGateStage,
  generateAutomationStage,
  executeTestsStage,
  publishReportStage
];

export const uploadWithoutExecutionStages: FlowStage[] = [
  loadReferencesStage,
  analyzeStoryStage,
  collectEvidenceStage,
  generateWorkbookStage,
  reviewGateStage,
  uploadToAdoStage
];
