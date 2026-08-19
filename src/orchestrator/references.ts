import fs from "node:fs";
import path from "node:path";
import type { ReferenceRootInput, StoryRunInput } from "./types";

export interface ResolvedReferenceRoot {
  planId: number;
  suiteId: number | null;
  label: string;
  recursive: boolean;
  source: "default" | "input";
}

export interface ResolvedTemplate {
  path: string;
  exists: boolean;
  source: "input" | "default";
}

const DEFAULT_TEMPLATE_PATH = "C:\\Users\\bsaikiran\\STLCFlow\\knowledge\\Referenced Template VSTS.xlsx";

const DEFAULT_REFERENCE_ROOTS: ResolvedReferenceRoot[] = [
  {
    planId: 6357,
    suiteId: 70798,
    label: "Master Regression > Match Angular",
    recursive: true,
    source: "default"
  },
  {
    planId: 6357,
    suiteId: 149176,
    label: "Master Regression > TDL",
    recursive: true,
    source: "default"
  },
  {
    planId: 191930,
    suiteId: null,
    label: "Latest Release Match Plan",
    recursive: true,
    source: "default"
  }
];

function normalizeReferenceRoot(root: ReferenceRootInput): ResolvedReferenceRoot {
  return {
    planId: root.planId,
    suiteId: typeof root.suiteId === "number" ? root.suiteId : null,
    label:
      root.label?.trim() ||
      (typeof root.suiteId === "number"
        ? `Plan ${root.planId} / Suite ${root.suiteId}`
        : `Plan ${root.planId}`),
    recursive: root.recursive !== false,
    source: "input"
  };
}

export function resolveTemplate(projectRoot: string, input: StoryRunInput): ResolvedTemplate {
  const configuredPath = input.templatePath?.trim() || DEFAULT_TEMPLATE_PATH;
  const resolvedPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);

  return {
    path: resolvedPath,
    exists: fs.existsSync(resolvedPath),
    source: input.templatePath?.trim() ? "input" : "default"
  };
}

export function resolveReferenceRoots(input: StoryRunInput): ResolvedReferenceRoot[] {
  if (input.referenceRoots?.length) {
    return input.referenceRoots.map(normalizeReferenceRoot);
  }

  return DEFAULT_REFERENCE_ROOTS;
}

export function getDefaultReferenceRoots(): ResolvedReferenceRoot[] {
  return DEFAULT_REFERENCE_ROOTS;
}
