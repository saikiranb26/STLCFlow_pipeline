import { maintenanceAgent } from "../agents/maintenance-agent";
import type { FlowContext, StageResult } from "../types";

export async function executeTestsStage(context: FlowContext): Promise<StageResult> {
  return maintenanceAgent.executeTests(context);
}
