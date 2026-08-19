export type FlowStageKey =
  | "loadReferences"
  | "analyzeStory"
  | "collectEvidence"
  | "generateWorkbook"
  | "reviewGate"
  | "uploadToAdo"
  | "generateAutomation"
  | "executeTests"
  | "publishReport";

export type FlowAgentKey =
  | "story"
  | "scenarioExploration"
  | "locator"
  | "framework"
  | "maintenance";

export type StageStatus = "pending" | "completed" | "blocked" | "skipped";

export interface ReferenceRootInput {
  planId: number;
  suiteId?: number;
  label?: string;
  recursive?: boolean;
}

export interface StoryRunInput {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  testCaseId?: number;
  project?: string;
  referencePlanIds?: number[];
  referenceSuiteIds?: number[];
  referenceRoots?: ReferenceRootInput[];
  templatePath?: string;
  navigationPath?: string;
  reviewApproved?: boolean;
  approvedWorkbookPath?: string;
  outputRoot?: string;
}

export interface StageResult {
  key: FlowStageKey;
  agentKey?: FlowAgentKey;
  status: StageStatus;
  summary: string;
  artifactPaths: string[];
  nextAction?: string;
}

export interface FlowContext {
  projectRoot: string;
  configRoot: string;
  knowledgeRoot: string;
  testsRoot: string;
  artifactsRoot: string;
  storyArtifactsRoot: string;
  input: StoryRunInput;
  startedAt: string;
}

export interface FlowSummary {
  input: StoryRunInput;
  overallStatus: "completed" | "blocked";
  stages: StageResult[];
  blockedStage?: StageResult;
  stateFilePath: string;
}

export type FlowStage = (context: FlowContext) => Promise<StageResult>;
