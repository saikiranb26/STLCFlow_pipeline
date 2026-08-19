import type { FlowContext, FlowSummary } from "./types";
import { fullPlaywrightWorkflowStages } from "./stage-catalog";
import { runSelectedStages } from "./run-stages";

export async function runPipeline(context: FlowContext): Promise<FlowSummary> {
  return runSelectedStages(context, fullPlaywrightWorkflowStages);
}
