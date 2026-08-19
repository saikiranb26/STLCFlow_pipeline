import fs from "node:fs";
import path from "node:path";
import type { FlowContext } from "./types";

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return clean(value)
    .replace(/^\d+\s*[:\-]?\s*/u, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function readStoryTitle(context: FlowContext): string {
  const summaryPath = path.join(context.storyArtifactsRoot, "story-summary.json");
  if (!fs.existsSync(summaryPath)) {
    return "";
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as { title?: string };
    return clean(summary.title || "");
  } catch {
    return "";
  }
}

export function getStoryFolderName(context: FlowContext): string {
  const storyId = String(context.input.workItemId);
  const titleSlug = slugify(readStoryTitle(context));
  return titleSlug ? `${storyId}-${titleSlug}` : storyId;
}

export function removeGeneratedStoryFolders(parentRoot: string, workItemId: number): void {
  const resolvedRoot = path.resolve(parentRoot);
  if (!fs.existsSync(resolvedRoot)) {
    return;
  }

  const storyPrefix = `${workItemId}`;
  for (const entry of fs.readdirSync(resolvedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name !== storyPrefix && !entry.name.startsWith(`${storyPrefix}-`)) {
      continue;
    }

    const targetPath = path.resolve(resolvedRoot, entry.name);
    if (!targetPath.startsWith(resolvedRoot)) {
      throw new Error(`Refusing to remove generated story folder outside expected root: ${targetPath}`);
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}
