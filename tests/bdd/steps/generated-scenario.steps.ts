import path from "node:path";
import fs from "node:fs";
import type { Page } from "@playwright/test";
import {
  attachGeneratedStepScreenshot,
  createGeneratedScenarioRuntimeState,
  executeGeneratedScenarioStep
} from "../../utils/scenario-runner";
import { readGeneratedScenarioFile, type GeneratedScenarioFile } from "../../utils/generated-scenario";
import { readAutomationManifest } from "../../utils/automation-manifest";
import type { LoginPage } from "../../pages/login.page";
import type { MatchShellPage } from "../../pages/match-shell.page";
import type { GeneratedScenarioState } from "../fixtures/test";
import { test } from "./bdd";

function extractTaggedNumber(tags: string[], pattern: RegExp): number | undefined {
  for (const tag of tags) {
    const match = tag.match(pattern);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return undefined;
}

function getCurrentTestTags(): string[] {
  const testInfo = test.info() as unknown as {
    tags?: string[];
    annotations?: Array<{ type: string; description?: string }>;
  };
  const directTags = Array.isArray(testInfo.tags) ? testInfo.tags : [];
  const annotationTags = (testInfo.annotations || [])
    .filter((annotation) => annotation.type === "tag" && annotation.description)
    .map((annotation) => annotation.description as string);

  return Array.from(new Set([...directTags, ...annotationTags]));
}

function getGeneratedDataRootCandidates(projectRoot: string, workItemId: number): string[] {
  const generatedDataParent = path.join(projectRoot, "tests", "data", "generated");
  const exactRoot = path.join(generatedDataParent, String(workItemId));
  const roots = new Set<string>();
  if (fs.existsSync(exactRoot)) {
    roots.add(exactRoot);
  }

  if (fs.existsSync(generatedDataParent)) {
    for (const entry of fs.readdirSync(generatedDataParent, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(`${workItemId}-`)) {
        roots.add(path.join(generatedDataParent, entry.name));
      }
    }
  }

  return Array.from(roots);
}

function extractWorkItemIdFromSpecPath(specFilePath: string): number | undefined {
  const normalized = specFilePath.replace(/\\/g, "/");
  const folderMatch = normalized.match(/\.features-gen\/tests\/bdd\/features\/generated\/(\d+)(?:-|\/)/i);
  const fileMatch = normalized.match(/\/story-(\d+)-suite-\d+\.feature\.spec\.js$/i);
  const value = Number(folderMatch?.[1] || fileMatch?.[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function inferGeneratedScenarioPathFromTags(projectRoot: string, tags: string[], specFilePath: string): string | undefined {
  const workItemId = extractTaggedNumber(tags, /^@story-(\d+)$/i) || extractWorkItemIdFromSpecPath(specFilePath);
  const testCaseId = extractTaggedNumber(tags, /^@tc-(\d+)$/i) || extractTaggedNumber(tags, /^@(\d+)$/i);
  if (!workItemId || !testCaseId) {
    return undefined;
  }

  for (const generatedDataRoot of getGeneratedDataRootCandidates(projectRoot, workItemId)) {
    const manifestPath = path.join(generatedDataRoot, "story-automation-manifest.json");
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    const manifest = readAutomationManifest(manifestPath);
    const scenario = manifest.scenarios.find((item) => item.testCaseId === testCaseId);
    if (scenario) {
      return path.join(generatedDataRoot, `${scenario.key}.scenario.json`);
    }
  }

  throw new Error(`Unable to find testcase ${testCaseId} in generated scenario manifests for story ${workItemId}.`);
}

function inferGeneratedScenarioPathFromSpec(projectRoot: string, specFilePath: string): string {
  const normalized = specFilePath.replace(/\\/g, "/");
  const match = normalized.match(/\.features-gen\/tests\/bdd\/features\/generated\/([^/]+)\/([^/]+)\.feature\.spec\.js$/i);
  if (!match?.[1] || !match?.[2]) {
    throw new Error(`Unable to infer generated scenario data path from spec file: ${specFilePath}`);
  }

  return path.join(projectRoot, "tests", "data", "generated", match[1], `${match[2]}.scenario.json`);
}

export interface GeneratedStepInput {
  runtimeProjectRoot: string;
  generatedScenarioState: GeneratedScenarioState;
  storyPage: Page;
  loginPage: LoginPage;
  matchShellPage: MatchShellPage;
}

export interface GeneratedStepFixtures {
  runtime: { projectRoot: string };
  generatedScenarioState: GeneratedScenarioState;
  storyPage: Page;
  loginPage: LoginPage;
  matchShellPage: MatchShellPage;
}

export function ensureGeneratedScenarioLoaded(runtimeProjectRoot: string, generatedScenarioState: GeneratedScenarioState): void {
  if (generatedScenarioState.scenarioFile) {
    return;
  }

  const scenarioPath =
    inferGeneratedScenarioPathFromTags(runtimeProjectRoot, getCurrentTestTags(), test.info().file) ||
    inferGeneratedScenarioPathFromSpec(runtimeProjectRoot, test.info().file);
  generatedScenarioState.scenarioFile = readGeneratedScenarioFile(scenarioPath);
  generatedScenarioState.executionResult = undefined;
  generatedScenarioState.executionCursor = 0;
  generatedScenarioState.currentTaskName = "";
  generatedScenarioState.expectedLegacyPage = "";
  generatedScenarioState.expectedLegacyPageSize = "";
  generatedScenarioState.artifactPaths = [];
}

export async function executeExpectedGeneratedStep(
  input: GeneratedStepInput,
  expectedKinds: string[]
): Promise<void> {
  ensureGeneratedScenarioLoaded(input.runtimeProjectRoot, input.generatedScenarioState);
  const scenarioFile = input.generatedScenarioState.scenarioFile;
  if (!scenarioFile) {
    throw new Error("Generated scenario file is not loaded.");
  }

  const cursor = Number(input.generatedScenarioState.executionCursor || 0);
  const step = scenarioFile.scenario.executionSteps[cursor];
  if (!step) {
    throw new Error(`No execution step remains for testcase ${scenarioFile.scenario.testCaseId || scenarioFile.scenario.key}.`);
  }

  if (!expectedKinds.includes(step.kind)) {
    throw new Error(`Generated step mismatch. Expected ${expectedKinds.join(" or ")} but next execution step is ${step.kind}.`);
  }

  const runtimeState = createGeneratedScenarioRuntimeState();
  runtimeState.currentTaskName = input.generatedScenarioState.currentTaskName || "";
  runtimeState.expectedLegacyPage = input.generatedScenarioState.expectedLegacyPage || "";
  runtimeState.expectedLegacyPageSize = input.generatedScenarioState.expectedLegacyPageSize || "";
  runtimeState.artifactPaths = input.generatedScenarioState.artifactPaths || [];

  try {
    await executeGeneratedScenarioStep({
      page: input.storyPage,
      loginPage: input.loginPage,
      matchShellPage: input.matchShellPage,
      scenarioFile,
      step,
      runtimeState
    });
    input.generatedScenarioState.currentTaskName = runtimeState.currentTaskName;
    input.generatedScenarioState.expectedLegacyPage = runtimeState.expectedLegacyPage;
    input.generatedScenarioState.expectedLegacyPageSize = runtimeState.expectedLegacyPageSize;
    input.generatedScenarioState.artifactPaths = runtimeState.artifactPaths;
    input.generatedScenarioState.executionCursor = cursor + 1;
    await attachGeneratedStepScreenshot({
      page: input.storyPage,
      testInfo: test.info(),
      scenarioFile,
      step,
      stepIndex: cursor,
      status: "passed",
      runtimeState
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await attachGeneratedStepScreenshot({
      page: input.storyPage,
      testInfo: test.info(),
      scenarioFile,
      step,
      stepIndex: cursor,
      status: "failed",
      runtimeState
    });
    input.generatedScenarioState.currentTaskName = runtimeState.currentTaskName;
    input.generatedScenarioState.expectedLegacyPage = runtimeState.expectedLegacyPage;
    input.generatedScenarioState.expectedLegacyPageSize = runtimeState.expectedLegacyPageSize;
    input.generatedScenarioState.artifactPaths = runtimeState.artifactPaths;
    input.generatedScenarioState.executionResult = {
      outcome: "Failed",
      classification: "automation-issue",
      comment: message,
      failedStep: {
        step: step.notes || step.target || step.label || step.expected || step.kind,
        error: message
      },
      artifactPaths: runtimeState.artifactPaths
    };
    throw error;
  }
}

export function markGeneratedScenarioPassed(generatedScenarioState: GeneratedScenarioState): void {
  generatedScenarioState.executionResult = {
    outcome: "Passed",
    comment: "Generated scenario executed successfully.",
    artifactPaths: generatedScenarioState.artifactPaths || []
  };
}

export function completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState: GeneratedScenarioState): void {
  const scenarioFile = generatedScenarioState.scenarioFile;
  if (!scenarioFile) {
    throw new Error("Generated scenario file is not loaded.");
  }

  const cursor = Number(generatedScenarioState.executionCursor || 0);
  const nextStep = scenarioFile.scenario.executionSteps[cursor];
  if (!nextStep) {
    markGeneratedScenarioPassed(generatedScenarioState);
    return;
  }

  if (nextStep.kind !== "legacyReportsAssertRetainedState") {
    throw new Error(`Generated step mismatch. Expected the scenario to be at retained-state verification, but next execution step is ${nextStep.kind}.`);
  }
}
