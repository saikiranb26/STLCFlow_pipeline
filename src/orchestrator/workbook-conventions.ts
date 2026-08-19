import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson } from "../utils/fs";
import type { StoryRunInput } from "./types";

interface StorySummaryTitleShape {
  title?: string;
}

export interface ResolvedWorkbookPath {
  path: string;
  source: "explicit-input" | "generated-excel-exact" | "generated-excel-fuzzy";
}

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toSafeFileStem(value: string): string {
  return clean(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStoryArtifactsRoot(projectRoot: string, input: StoryRunInput): string {
  const outputRoot = input.outputRoot
    ? path.resolve(projectRoot, input.outputRoot)
    : path.join(projectRoot, "artifacts", "stories");
  return path.join(outputRoot, String(input.workItemId));
}

function getStorySummaryTitle(projectRoot: string, input: StoryRunInput): string | undefined {
  const storySummaryPath = path.join(getStoryArtifactsRoot(projectRoot, input), "story-summary.json");
  if (!fs.existsSync(storySummaryPath)) {
    return undefined;
  }

  try {
    const storySummary = readJson<StorySummaryTitleShape>(storySummaryPath);
    return clean(storySummary.title || "");
  } catch {
    return undefined;
  }
}

function getCandidateBaseNames(projectRoot: string, input: StoryRunInput): string[] {
  const storyTitle = getStorySummaryTitle(projectRoot, input);
  return Array.from(
    new Set(
      [
        storyTitle ? toSafeFileStem(storyTitle) : "",
        storyTitle ? toSafeFileStem(`${input.workItemId} ${storyTitle}`) : "",
        String(input.workItemId)
      ].filter(Boolean)
    )
  );
}

export function getGeneratedExcelRoot(projectRoot: string, input?: StoryRunInput): string {
  const generatedExcelRoot = input?.outputRoot
    ? path.join(path.resolve(projectRoot, input.outputRoot), "generated-excel")
    : path.join(projectRoot, "artifacts", "generated-excel");
  ensureDir(generatedExcelRoot);
  return generatedExcelRoot;
}

export function getExpectedWorkbookPath(projectRoot: string, input: StoryRunInput): string {
  const generatedExcelRoot = getGeneratedExcelRoot(projectRoot, input);
  const title = getStorySummaryTitle(projectRoot, input);
  const fileName = title ? `${toSafeFileStem(title)}.xlsx` : `${input.workItemId}.xlsx`;
  return path.join(generatedExcelRoot, fileName);
}

export function resolveApprovedWorkbookPath(projectRoot: string, input: StoryRunInput): ResolvedWorkbookPath | null {
  const explicitPath = clean(input.approvedWorkbookPath || "");
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath) ? explicitPath : path.resolve(projectRoot, explicitPath);
    if (fs.existsSync(resolved)) {
      return {
        path: resolved,
        source: "explicit-input"
      };
    }
  }

  const generatedExcelRoot = getGeneratedExcelRoot(projectRoot, input);
  const candidateBaseNames = getCandidateBaseNames(projectRoot, input);
  const allExcelFiles = fs
    .readdirSync(generatedExcelRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx") && !entry.name.startsWith("~$"))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(generatedExcelRoot, entry.name),
      mtimeMs: fs.statSync(path.join(generatedExcelRoot, entry.name)).mtimeMs
    }));

  const exactMatches = allExcelFiles.filter((file) =>
    candidateBaseNames.some((candidate) => file.name.toLowerCase() === `${candidate}.xlsx`.toLowerCase())
  );
  const fuzzyMatches = allExcelFiles.filter((file) => file.name.includes(String(input.workItemId)));
  const combined = Array.from(new Map([...exactMatches, ...fuzzyMatches].map((file) => [file.fullPath, file])).values()).sort(
    (left, right) => right.mtimeMs - left.mtimeMs
  );

  if (combined.length > 0) {
    const chosen = combined[0];
    const source = exactMatches.some((file) => file.fullPath === chosen.fullPath)
      ? ("generated-excel-exact" as const)
      : ("generated-excel-fuzzy" as const);

    return {
      path: chosen.fullPath,
      source
    };
  }

  return null;
}
