import { storyAgent } from "../agents/story-agent";
import type { FlowContext, StageResult } from "../types";

export async function analyzeStoryStage(context: FlowContext): Promise<StageResult> {
  return storyAgent.analyzeStory(context);
}
