import { scenarioExplorationAgent } from "../agents/scenario-exploration-agent";
import type { FlowContext, StageResult } from "../types";

export async function collectEvidenceStage(context: FlowContext): Promise<StageResult> {
  return scenarioExplorationAgent.collectEvidence(context);
}
