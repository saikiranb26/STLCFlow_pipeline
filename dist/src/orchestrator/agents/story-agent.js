"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storyAgent = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_child_process_1 = require("node:child_process");
const fs_1 = require("../../utils/fs");
const ado_story_1 = require("../ado-story");
const knowledge_1 = require("../knowledge");
const legacy_workflow_bridge_1 = require("../legacy-workflow-bridge");
const references_1 = require("../references");
const story_analysis_1 = require("../story-analysis");
const workbook_conventions_1 = require("../workbook-conventions");
const workbook_generation_1 = require("../workbook-generation");
function resolveStoryGeneratorScript(projectRoot, workItemId) {
    const candidates = [
        node_path_1.default.join(projectRoot, "scripts", `generate-${workItemId}-recent-release-workbook.js`),
        node_path_1.default.join(projectRoot, "scripts", `generate-${workItemId}-workbook.js`)
    ];
    return candidates.find((candidate) => node_fs_1.default.existsSync(candidate)) || null;
}
function runStoryGeneratorScript(scriptPath) {
    const result = (0, node_child_process_1.spawnSync)(process.execPath, [scriptPath], {
        cwd: node_path_1.default.dirname(scriptPath),
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
    const parsed = JSON.parse(outputText);
    if (!parsed.workbookPath || !node_fs_1.default.existsSync(parsed.workbookPath)) {
        throw new Error(`Workbook generator script did not produce a valid workbook path: ${scriptPath}`);
    }
    return parsed;
}
exports.storyAgent = {
    async analyzeStory(context) {
        const analysisPlanPath = node_path_1.default.join(context.storyArtifactsRoot, "story-analysis-plan.json");
        const storySummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "story-summary.json");
        const coveragePlanPath = node_path_1.default.join(context.storyArtifactsRoot, "coverage-plan.json");
        const openQuestionsPath = node_path_1.default.join(context.storyArtifactsRoot, "open-questions.json");
        const knowledgeArtifacts = (0, knowledge_1.getKnowledgeArtifactPaths)(context.knowledgeRoot);
        const storySnapshot = await (0, ado_story_1.fetchStoryWorkItemSnapshot)(context.input.workItemId, context.input.project || "Cadency");
        const analysis = (0, story_analysis_1.buildStoryAnalysisBundleFromStory)(context, {
            title: storySnapshot.title,
            description: storySnapshot.description,
            acceptanceCriteria: storySnapshot.acceptanceCriteria
        });
        (0, fs_1.writeJson)(analysisPlanPath, {
            agent: "Story Agent",
            workItemId: context.input.workItemId,
            project: context.input.project || "Cadency",
            inferredDomain: analysis.domain,
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
                knowledgeArtifacts.referenceHarvestStatusPath
            ]
        });
        (0, fs_1.writeJson)(storySummaryPath, {
            ...storySnapshot,
            domain: analysis.domain,
            featureArea: analysis.featureArea,
            status: "ready-for-workbook-generation",
            liveEvidenceMode: analysis.liveEvidenceMode,
            source: "live-ado-intake"
        });
        (0, fs_1.writeJson)(coveragePlanPath, {
            agent: "Story Agent",
            workItemId: context.input.workItemId,
            domain: analysis.domain,
            featureArea: analysis.featureArea,
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
                "Do not copy-paste old testcase content into new stories.",
                "Keep unknown UI wording generic until live evidence confirms exact labels."
            ]
        });
        (0, fs_1.writeJson)(openQuestionsPath, {
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
    async generateWorkbook(context) {
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "workbook-generation-plan.json");
        const storySummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "story-summary.json");
        const coveragePlanPath = node_path_1.default.join(context.storyArtifactsRoot, "coverage-plan.json");
        const template = (0, references_1.resolveTemplate)(context.projectRoot, context.input);
        if (!template.exists) {
            (0, fs_1.writeJson)(artifactPath, {
                agent: "Story Agent",
                status: "blocked",
                reason: "Excel template path is missing or does not exist.",
                resolvedTemplatePath: template.path,
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
        const draftWorkbookPath = (0, workbook_conventions_1.getExpectedWorkbookPath)(context.projectRoot, context.input);
        const sidecarPath = node_path_1.default.join(context.storyArtifactsRoot, `testcases_${context.input.workItemId}_draft.sidecar.json`);
        if (!node_path_1.default.isAbsolute(storySummaryPath) || !node_path_1.default.isAbsolute(coveragePlanPath)) {
            (0, fs_1.writeJson)(artifactPath, {
                agent: "Story Agent",
                status: "blocked",
                reason: "Story analysis artifacts are unresolved."
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
        const storySummary = (0, fs_1.readJson)(storySummaryPath);
        const coveragePlan = (0, fs_1.readJson)(coveragePlanPath);
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
            (0, fs_1.writeJson)(artifactPath, {
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
            const generation = (0, workbook_generation_1.generateWorkbookFromStoryArtifacts)(context, template.path, storySummary, coveragePlan);
            (0, fs_1.writeJson)(artifactPath, {
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
        const generation = await (0, legacy_workflow_bridge_1.runLegacyWorkbookGeneration)(context);
        (0, legacy_workflow_bridge_1.writeStoryArtifactsFromLegacyPayload)(context, generation);
        (0, fs_1.writeJson)(artifactPath, {
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
    async uploadReviewedWorkbook(context) {
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "ado-upload-plan.json");
        const resolvedWorkbook = (0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input);
        const approvedWorkbookPath = resolvedWorkbook?.path || "";
        if (!approvedWorkbookPath) {
            (0, fs_1.writeJson)(artifactPath, {
                agent: "Story Agent",
                project: context.input.project || "Cadency",
                suiteId: context.input.suiteId,
                testPlanId: context.input.testPlanId,
                sourceWorkbook: "",
                uploadRule: "Use the reviewed workbook only. Preserve user edits and additions exactly."
            });
            return {
                key: "uploadToAdo",
                agentKey: "story",
                status: "blocked",
                summary: "Story Agent is blocked from Azure DevOps upload because the approved workbook could not be resolved.",
                artifactPaths: [artifactPath],
                nextAction: `Save the approved workbook under ${node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel")} or provide approvedWorkbookPath explicitly.`
            };
        }
        const uploadPlan = {
            agent: "Story Agent",
            project: context.input.project || "Cadency",
            suiteId: context.input.suiteId,
            testPlanId: context.input.testPlanId,
            sourceWorkbook: approvedWorkbookPath,
            workbookResolutionSource: resolvedWorkbook?.source || "unknown",
            uploadRule: "Use the reviewed workbook only. Preserve user edits and additions exactly."
        };
        const upload = await (0, legacy_workflow_bridge_1.runLegacyWorkbookUpload)(context, approvedWorkbookPath);
        const uploadSummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "upload-summary.json");
        (0, fs_1.writeJson)(artifactPath, {
            ...uploadPlan,
            status: "completed-via-legacy-bridge",
            legacyBridge: {
                stagedUploadWorkbookPath: upload.stagedUploadWorkbookPath
            },
            createdCaseCount: upload.createdCaseMap.length
        });
        (0, fs_1.writeJson)(uploadSummaryPath, {
            agent: "Story Agent",
            project: context.input.project || "Cadency",
            workItemId: context.input.workItemId,
            suiteId: context.input.suiteId,
            testPlanId: context.input.testPlanId,
            sourceWorkbook: approvedWorkbookPath,
            createdCaseMap: upload.createdCaseMap
        });
        return {
            key: "uploadToAdo",
            agentKey: "story",
            status: "completed",
            summary: `Story Agent uploaded the reviewed workbook for story ${context.input.workItemId} into suite ${context.input.suiteId} using the legacy uploader bridge.`,
            artifactPaths: [artifactPath, uploadSummaryPath]
        };
    }
};
