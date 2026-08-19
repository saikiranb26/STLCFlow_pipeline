import path from "node:path";
import { writeJson } from "../utils/fs";
import type { FlowContext, FlowStage, FlowSummary, StageResult } from "./types";

export function getStateFilePath(context: FlowContext): string {
  return path.join(context.storyArtifactsRoot, "run-state.json");
}

function persistState(context: FlowContext, stageResults: StageResult[]): void {
  writeJson(getStateFilePath(context), {
    story: context.input,
    startedAt: context.startedAt,
    updatedAt: new Date().toISOString(),
    stageResults
  });
}

export async function runSelectedStages(
  context: FlowContext,
  stages: FlowStage[],
  existingResults: StageResult[] = []
): Promise<FlowSummary> {
  const stageResults: StageResult[] = [...existingResults];

  for (const stage of stages) {
    const result = await stage(context);
    stageResults.push(result);
    persistState(context, stageResults);

    if (result.status === "blocked") {
      return {
        input: context.input,
        overallStatus: "blocked",
        stages: stageResults,
        blockedStage: result,
        stateFilePath: getStateFilePath(context)
      };
    }
  }

  return {
    input: context.input,
    overallStatus: "completed",
    stages: stageResults,
    stateFilePath: getStateFilePath(context)
  };
}
