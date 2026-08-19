import { storyAgent } from "../agents/story-agent";
import type { FlowContext, StageResult } from "../types";

export async function uploadToAdoStage(context: FlowContext): Promise<StageResult> {
  return storyAgent.uploadReviewedWorkbook(context);
}
