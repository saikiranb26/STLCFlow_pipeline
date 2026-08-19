import { maintenanceAgent } from "../agents/maintenance-agent";
import type { FlowContext, StageResult } from "../types";

export async function publishReportStage(context: FlowContext): Promise<StageResult> {
  return maintenanceAgent.publishReport(context);
}
