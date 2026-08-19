import path from "node:path";
import { readJson } from "../utils/fs";

export interface ReferenceRootsDocument {
  generatedDate: string;
  sourceOfTruth: string;
  project: string;
  recursiveRootRule: string;
  roots: Array<{
    planId: number;
    suiteId: number | null;
    label: string;
    recursive: boolean;
    domain: string;
  }>;
}

export interface ReferenceSuiteCorpusDocument {
  generatedDate: string;
  sourceOfTruth: string;
  project: string;
  guardrails: string[];
  prioritySuites: Array<{
    planId: number;
    suiteId: number;
    name: string;
    root: string;
    domain: string;
    knowledgeRole: string;
    observedPatterns: string[];
    sampleCaseTitles: string[];
  }>;
}

export interface ReferenceHarvestStatusDocument {
  generatedDate: string;
  sourceOfTruth: string;
  statusLegend: Record<string, string>;
  roots: unknown[];
}

export interface KnowledgeArtifactPaths {
  referenceRootsPath: string;
  referenceSuiteCorpusPath: string;
  referenceHarvestStatusPath: string;
  matchHelpRootPath: string;
  matchHelpReadmePath: string;
  matchHelpPageIndexPath: string;
}

export function getKnowledgeArtifactPaths(knowledgeRoot: string): KnowledgeArtifactPaths {
  const matchHelpRootPath = path.join(knowledgeRoot, "match-help");

  return {
    referenceRootsPath: path.join(knowledgeRoot, "reference-roots.ado.json"),
    referenceSuiteCorpusPath: path.join(knowledgeRoot, "reference-suite-corpus.json"),
    referenceHarvestStatusPath: path.join(knowledgeRoot, "reference-harvest-status.json"),
    matchHelpRootPath,
    matchHelpReadmePath: path.join(matchHelpRootPath, "README.md"),
    matchHelpPageIndexPath: path.join(matchHelpRootPath, "match-help-page-index.json")
  };
}

export function loadReferenceRoots(knowledgeRoot: string): ReferenceRootsDocument {
  return readJson<ReferenceRootsDocument>(getKnowledgeArtifactPaths(knowledgeRoot).referenceRootsPath);
}

export function loadReferenceSuiteCorpus(knowledgeRoot: string): ReferenceSuiteCorpusDocument {
  return readJson<ReferenceSuiteCorpusDocument>(
    getKnowledgeArtifactPaths(knowledgeRoot).referenceSuiteCorpusPath
  );
}

export function loadReferenceHarvestStatus(knowledgeRoot: string): ReferenceHarvestStatusDocument {
  return readJson<ReferenceHarvestStatusDocument>(
    getKnowledgeArtifactPaths(knowledgeRoot).referenceHarvestStatusPath
  );
}
