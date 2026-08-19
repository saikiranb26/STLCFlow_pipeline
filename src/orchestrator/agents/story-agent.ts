import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { readJson, writeJson } from "../../utils/fs";
import { fetchStoryWorkItemSnapshot } from "../ado-story";
import { getKnowledgeArtifactPaths } from "../knowledge";
import { runLegacyWorkbookGeneration, runLegacyWorkbookUpload, writeStoryArtifactsFromLegacyPayload } from "../legacy-workflow-bridge";
import { resolveTemplate } from "../references";
import { buildStoryAnalysisBundleFromStory } from "../story-analysis";
import type { FlowContext, StageResult } from "../types";
import { getExpectedWorkbookPath, resolveApprovedWorkbookPath } from "../workbook-conventions";
import { generateWorkbookFromStoryArtifacts } from "../workbook-generation";
import type { CoveragePlanShape, StorySummaryShape } from "../workbook-generation";
import { getFlowAgentBestPractices } from "./agent-catalog";
import type { StoryAgent } from "./types";

interface ScriptGenerationResult {
  workbookPath: string;
  caseCount?: number;
}

function resolveStoryGeneratorScript(projectRoot: string, workItemId: number): string | null {
  const candidates = [
    path.join(projectRoot, "scripts", `generate-${workItemId}-recent-release-workbook.js`),
    path.join(projectRoot, "scripts", `generate-${workItemId}-workbook.js`)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function runStoryGeneratorScript(scriptPath: string): ScriptGenerationResult {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.dirname(scriptPath),
    encoding: "utf8",
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    throw new Error(result.stderr?.trim() || `Workbook generator script failed: ${scriptPath}`);
  }

  const outputText = result.stdout?.trim() || "";
  const parsed = JSON.parse(outputText) as ScriptGenerationResult;
  if (!parsed.workbookPath || !fs.existsSync(parsed.workbookPath)) {
    throw new Error(`Workbook generator script did not produce a valid workbook path: ${scriptPath}`);
  }

  return parsed;
}

export const storyAgent: StoryAgent = {
  async analyzeStory(context: FlowContext): Promise<StageResult> {
    const analysisPlanPath = path.join(context.storyArtifactsRoot, "story-analysis-plan.json");
    const storySummaryPath = path.join(context.storyArtifactsRoot, "story-summary.json");
    const coveragePlanPath = path.join(context.storyArtifactsRoot, "coverage-plan.json");
    const openQuestionsPath = path.join(context.storyArtifactsRoot, "open-questions.json");
    const knowledgeArtifacts = getKnowledgeArtifactPaths(context.knowledgeRoot);
    const storySnapshot = await fetchStoryWorkItemSnapshot(
      context.input.workItemId,
      context.input.project || "Cadency"
    );
    const analysis = buildStoryAnalysisBundleFromStory(context, {
      title: storySnapshot.title,
      description: storySnapshot.description,
      acceptanceCriteria: storySnapshot.acceptanceCriteria
    });

    writeJson(analysisPlanPath, {
      agent: "Story Agent",
      workItemId: context.input.workItemId,
      project: context.input.project || "Cadency",
      inferredDomain: analysis.domain,
      bestPractices: getFlowAgentBestPractices("story"),
      requiredReads: [
        "story fields",
        "acceptance criteria",
        "comments",
        "attachments",
        "linked items",
        "child tasks",
        "related bugs"
      ],
      outputArtifacts: [
        "story-summary.json",
        "coverage-plan.json",
        "open-questions.json"
      ],
      selectedReferenceSuites: analysis.selectedReferenceSuites.map((suite) => ({
        planId: suite.planId,
        suiteId: suite.suiteId,
        name: suite.name,
        priority: suite.priority,
        whySelected: suite.whySelected
      })),
      liveEvidenceMode: analysis.liveEvidenceMode,
      referenceKnowledgeInputs: [
        knowledgeArtifacts.referenceRootsPath,
        knowledgeArtifacts.referenceSuiteCorpusPath,
        knowledgeArtifacts.referenceHarvestStatusPath,
        knowledgeArtifacts.matchHelpReadmePath,
        knowledgeArtifacts.matchHelpPageIndexPath
      ]
    });

    writeJson(storySummaryPath, {
      ...storySnapshot,
      domain: analysis.domain,
      featureArea: analysis.featureArea,
      status: "ready-for-workbook-generation",
      liveEvidenceMode: analysis.liveEvidenceMode,
      source: "live-ado-intake"
    });

    writeJson(coveragePlanPath, {
      agent: "Story Agent",
      workItemId: context.input.workItemId,
      domain: analysis.domain,
      featureArea: analysis.featureArea,
      bestPractices: getFlowAgentBestPractices("story"),
      coverageFamilies: analysis.coverageFamilies,
      selectedReferenceSuites: analysis.selectedReferenceSuites.map((suite) => ({
        planId: suite.planId,
        suiteId: suite.suiteId,
        name: suite.name,
        knowledgeRole: suite.knowledgeRole,
        observedPatterns: suite.observedPatterns,
        sampleCaseTitles: suite.sampleCaseTitles
      })),
      generationGuardrails: [
        "Use current story requirements as the source of truth.",
        "Use reference suites for style, coverage patterns, and realistic behavior only.",
        "Use Match Help knowledge for product terminology, screen/function context, and module-specific QA focus.",
        "Do not copy-paste old testcase content into new stories.",
        "Keep unknown UI wording generic until live evidence confirms exact labels."
      ]
    });

    writeJson(openQuestionsPath, {
      agent: "Story Agent",
      workItemId: context.input.workItemId,
      domain: analysis.domain,
      prompts: analysis.openQuestionPrompts,
      status: "review-during-story-and-workbook-generation"
    });

    return {
      key: "analyzeStory",
      agentKey: "story",
      status: "completed",
      summary: `Story Agent fetched live ADO story details and prepared story-analysis artifacts for work item ${context.input.workItemId} using ${analysis.selectedReferenceSuites.length} prioritized reference suites.`,
      artifactPaths: [analysisPlanPath, storySummaryPath, coveragePlanPath, openQuestionsPath]
    };
  },

  async generateWorkbook(context: FlowContext): Promise<StageResult> {
    const artifactPath = path.join(context.storyArtifactsRoot, "workbook-generation-plan.json");
    const storySummaryPath = path.join(context.storyArtifactsRoot, "story-summary.json");
    const coveragePlanPath = path.join(context.storyArtifactsRoot, "coverage-plan.json");
    const template = resolveTemplate(context.projectRoot, context.input);

    if (!template.exists) {
      writeJson(artifactPath, {
        agent: "Story Agent",
        status: "blocked",
        reason: "Excel template path is missing or does not exist.",
        resolvedTemplatePath: template.path,
        bestPractices: getFlowAgentBestPractices("story"),
        requiredInputs: ["templatePath"]
      });

      return {
        key: "generateWorkbook",
        agentKey: "story",
        status: "blocked",
        summary: "Story Agent cannot generate the workbook until the referenced Excel template exists.",
        artifactPaths: [artifactPath],
        nextAction: `Place the template at ${template.path} or update templatePath in the story run input.`
      };
    }

    const draftWorkbookPath = getExpectedWorkbookPath(context.projectRoot, context.input);
    const sidecarPath = path.join(
      context.storyArtifactsRoot,
      `testcases_${context.input.workItemId}_draft.sidecar.json`
    );

    if (!path.isAbsolute(storySummaryPath) || !path.isAbsolute(coveragePlanPath)) {
      writeJson(artifactPath, {
        agent: "Story Agent",
        status: "blocked",
        reason: "Story analysis artifacts are unresolved.",
        bestPractices: getFlowAgentBestPractices("story")
      });

      return {
        key: "generateWorkbook",
        agentKey: "story",
        status: "blocked",
        summary: "Story Agent requires story-analysis artifacts before workbook generation can continue.",
        artifactPaths: [artifactPath],
        nextAction: "Run the story-analysis stage first so story-summary and coverage-plan exist."
      };
    }

    const storySummary = readJson<StorySummaryShape & { status?: string; domain?: string }>(storySummaryPath);
    const coveragePlan = readJson<CoveragePlanShape>(coveragePlanPath);

    const basePlan = {
      agent: "Story Agent",
      templatePath: template.path,
      sourceArtifacts: {
        storySummaryPath,
        coveragePlanPath
      },
      domain: storySummary.domain || "unknown",
      selectedReferenceSuites: coveragePlan.selectedReferenceSuites || [],
      coverageFamilies: coveragePlan.coverageFamilies || [],
      bestPractices: getFlowAgentBestPractices("story"),
      outputFiles: [draftWorkbookPath, sidecarPath],
      reviewGateRequired: true,
      generationRules: [
        "Use the approved Excel template only.",
        "Write fresh testcase content for the current story.",
        "Use reference suites for style and coverage patterns only.",
        "Emit sidecar metadata for later automation generation.",
        "Write the generated workbook into artifacts/generated-excel using the story name or work item ID naming convention."
      ]
    };

    const storyGeneratorScript = resolveStoryGeneratorScript(context.projectRoot, context.input.workItemId);
    if (storyGeneratorScript) {
      const generation = runStoryGeneratorScript(storyGeneratorScript);

      writeJson(artifactPath, {
        ...basePlan,
        status: "completed-via-story-generator-script",
        generatorScriptPath: storyGeneratorScript,
        outputFiles: [generation.workbookPath, sidecarPath],
        generatedWorkbookPath: generation.workbookPath,
        generatedAt: new Date().toISOString(),
        totalTestCases: Number(generation.caseCount || 0)
      });

      return {
        key: "generateWorkbook",
        agentKey: "story",
        status: "completed",
        summary: `Story Agent generated the draft workbook for story ${context.input.workItemId} using the story-specific workbook generator script.`,
        artifactPaths: [artifactPath, generation.workbookPath]
      };
    }

    if (storySummary.status === "ready-for-workbook-generation") {
      const generation = generateWorkbookFromStoryArtifacts(
        context,
        template.path,
        storySummary,
        coveragePlan
      );

      writeJson(artifactPath, {
        ...basePlan,
        status: "completed-via-native-generator",
        outputFiles: [generation.workbookPath, generation.sidecarPath],
        generatedWorkbookPath: generation.workbookPath,
        generatedAt: new Date().toISOString(),
        totalTestCases: generation.totalTestCases
      });

      return {
        key: "generateWorkbook",
        agentKey: "story",
        status: "completed",
        summary: `Story Agent generated the draft workbook for story ${context.input.workItemId} using the native STLCFlow workbook generator.`,
        artifactPaths: [artifactPath, generation.workbookPath, generation.sidecarPath]
      };
    }

    const generation = await runLegacyWorkbookGeneration(context);
    writeStoryArtifactsFromLegacyPayload(context, generation);

    writeJson(artifactPath, {
      ...basePlan,
      status: "completed-via-legacy-bridge",
      legacyBridge: {
        mode: context.input.navigationPath?.trim() ? "playwright-evidence" : "stable-generator",
        legacyWorkbookPath: generation.legacyWorkbookPath,
        legacyJsonPath: generation.legacyJsonPath
      },
      outputFiles: [generation.stagedWorkbookPath, sidecarPath],
      generatedWorkbookPath: generation.stagedWorkbookPath,
      generatedAt: generation.generatedAt,
      totalTestCases: generation.totalTestCases
    });

    return {
      key: "generateWorkbook",
      agentKey: "story",
      status: "completed",
      summary: `Story Agent generated the draft workbook for story ${context.input.workItemId} and staged it into artifacts/generated-excel using the proven legacy generator bridge.`,
      artifactPaths: [artifactPath, generation.stagedWorkbookPath, generation.legacyJsonPath]
    };
  },

  async uploadReviewedWorkbook(context: FlowContext): Promise<StageResult> {
    const artifactPath = path.join(context.storyArtifactsRoot, "ado-upload-plan.json");
    const resolvedWorkbook = resolveApprovedWorkbookPath(context.projectRoot, context.input);
    const approvedWorkbookPath = resolvedWorkbook?.path || "";

    if (!approvedWorkbookPath) {
      writeJson(artifactPath, {
        agent: "Story Agent",
        project: context.input.project || "Cadency",
        suiteId: context.input.suiteId,
        testPlanId: context.input.testPlanId,
        sourceWorkbook: "",
        bestPractices: getFlowAgentBestPractices("story"),
        uploadRule: "Use the reviewed workbook only. Preserve user edits and additions exactly."
      });

      return {
        key: "uploadToAdo",
        agentKey: "story",
        status: "blocked",
        summary: "Story Agent is blocked from Azure DevOps upload because the approved workbook could not be resolved.",
        artifactPaths: [artifactPath],
        nextAction: `Save the approved workbook under ${path.join(context.projectRoot, "artifacts", "generated-excel")} or provide approvedWorkbookPath explicitly.`
      };
    }

    const uploadPlan = {
      agent: "Story Agent",
      project: context.input.project || "Cadency",
      suiteId: context.input.suiteId,
      testPlanId: context.input.testPlanId,
      sourceWorkbook: approvedWorkbookPath,
      workbookResolutionSource: resolvedWorkbook?.source || "unknown",
      bestPractices: getFlowAgentBestPractices("story"),
      duplicatePreventionPolicy:
        "Reuse exact or canonically equivalent suite testcase titles; block partial matches unless STLCFLOW_FORCE_ADO_UPLOAD is explicitly set.",
      uploadRule: "Use the reviewed workbook only. Preserve user edits and additions exactly."
    };

    const upload = await runLegacyWorkbookUpload(context, approvedWorkbookPath);
    const uploadSummaryPath = path.join(context.storyArtifactsRoot, "upload-summary.json");

    writeJson(artifactPath, {
      ...uploadPlan,
      status: upload.uploadMode === "reuse-existing-suite-cases" ? "completed-via-existing-suite-cases" : "completed-via-legacy-bridge",
      legacyBridge: {
        stagedUploadWorkbookPath: upload.stagedUploadWorkbookPath,
        skippedLegacyUploadReason: upload.skippedLegacyUploadReason
      },
      uploadMode: upload.uploadMode,
      createdCaseCount: upload.createdCaseCount,
      reusedCaseCount: upload.reusedCaseCount,
      existingSuiteCaseCount: upload.existingSuiteCaseCount,
      duplicateExistingTitleCount: upload.duplicateExistingTitleCount,
      duplicateExistingTitles: upload.duplicateExistingTitles
    });

    writeJson(uploadSummaryPath, {
      agent: "Story Agent",
      project: context.input.project || "Cadency",
      workItemId: context.input.workItemId,
      suiteId: context.input.suiteId,
      testPlanId: context.input.testPlanId,
      sourceWorkbook: approvedWorkbookPath,
      uploadMode: upload.uploadMode,
      createdCaseCount: upload.createdCaseCount,
      reusedCaseCount: upload.reusedCaseCount,
      skippedLegacyUploadReason: upload.skippedLegacyUploadReason,
      existingSuiteCaseCount: upload.existingSuiteCaseCount,
      duplicateExistingTitleCount: upload.duplicateExistingTitleCount,
      duplicateExistingTitles: upload.duplicateExistingTitles,
      createdCaseMap: upload.createdCaseMap
    });

    const uploadSummary =
      upload.uploadMode === "reuse-existing-suite-cases"
        ? `Story Agent reused ${upload.reusedCaseCount} existing ADO test cases in suite ${context.input.suiteId} for story ${context.input.workItemId}; legacy upload was skipped to avoid duplicates.`
        : `Story Agent uploaded the reviewed workbook for story ${context.input.workItemId} into suite ${context.input.suiteId} using the legacy uploader bridge.`;

    return {
      key: "uploadToAdo",
      agentKey: "story",
      status: "completed",
      summary: uploadSummary,
      artifactPaths: [artifactPath, uploadSummaryPath]
    };
  }
};
