import type { FlowAgentKey, FlowContext, FlowStageKey, StageResult } from "../types";

export interface FlowAgentDefinition {
  key: FlowAgentKey;
  name: string;
  responsibility: string;
  ownsStages: FlowStageKey[];
  primaryArtifacts: string[];
  operatingPrinciples: string[];
  qualityGates: string[];
  handoffRules: string[];
}

export interface StoryAgent {
  analyzeStory(context: FlowContext): Promise<StageResult>;
  generateWorkbook(context: FlowContext): Promise<StageResult>;
  uploadReviewedWorkbook(context: FlowContext): Promise<StageResult>;
}

export interface ScenarioExplorationAgent {
  collectEvidence(context: FlowContext): Promise<StageResult>;
}

export interface LocatorAgent {
  prepareLocatorStrategy(context: FlowContext): string;
}

export interface FrameworkAgent {
  generateAutomation(context: FlowContext, locatorPlanPath: string): Promise<StageResult>;
}

export interface MaintenanceAgent {
  executeTests(context: FlowContext): Promise<StageResult>;
  publishReport(context: FlowContext): Promise<StageResult>;
}
