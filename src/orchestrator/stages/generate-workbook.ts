import { storyAgent } from "../agents/story-agent";
import type { FlowContext, StageResult } from "../types";

export async function generateWorkbookStage(context: FlowContext): Promise<StageResult> {
  return storyAgent.generateWorkbook(context);
}
