import path from "node:path";
import { readJson, ensureDir } from "../utils/fs";
import type { FlowContext, StoryRunInput } from "./types";
import { getGeneratedExcelRoot } from "./workbook-conventions";

export function loadStoryRunInput(filePath: string): StoryRunInput {
  return readJson<StoryRunInput>(filePath);
}

export function createFlowContext(projectRoot: string, input: StoryRunInput): FlowContext {
  const outputRoot = input.outputRoot
    ? path.resolve(projectRoot, input.outputRoot)
    : path.join(projectRoot, "artifacts", "stories");
  const storyArtifactsRoot = path.join(outputRoot, String(input.workItemId));

  ensureDir(path.join(projectRoot, "config"));
  ensureDir(path.join(projectRoot, "knowledge"));
  ensureDir(path.join(projectRoot, "tests"));
  getGeneratedExcelRoot(projectRoot, input);
  ensureDir(outputRoot);
  ensureDir(storyArtifactsRoot);

  return {
    projectRoot,
    configRoot: path.join(projectRoot, "config"),
    knowledgeRoot: path.join(projectRoot, "knowledge"),
    testsRoot: path.join(projectRoot, "tests"),
    artifactsRoot: outputRoot,
    storyArtifactsRoot,
    input,
    startedAt: new Date().toISOString()
  };
}
