"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadReferencesStage = loadReferencesStage;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../../utils/fs");
const references_1 = require("../references");
async function loadReferencesStage(context) {
    const intakeArtifactPath = node_path_1.default.join(context.storyArtifactsRoot, "reference-intake.json");
    const extractionPlanArtifactPath = node_path_1.default.join(context.storyArtifactsRoot, "reference-extraction-plan.json");
    const template = (0, references_1.resolveTemplate)(context.projectRoot, context.input);
    const referenceRoots = (0, references_1.resolveReferenceRoots)(context.input);
    const uniquePlanIds = [...new Set(referenceRoots.map((root) => root.planId))];
    (0, fs_1.writeJson)(intakeArtifactPath, {
        project: context.input.project || "Cadency",
        template,
        referenceRoots,
        extractionMode: "ado-direct-recursive",
        sourceOfTruth: "Azure DevOps MCP",
        knowledgeRule: "Reference suites are pattern and coverage sources only. Newly generated story testcases must be freshly written and must not copy-paste old testcase content.",
        existingKnowledgeArtifacts: [
            node_path_1.default.join(context.knowledgeRoot, "match-application-reference-analysis.md"),
            node_path_1.default.join(context.knowledgeRoot, "ado-direct-coverage-status.md"),
            node_path_1.default.join(context.knowledgeRoot, "latest-release-recurring-patterns.md"),
            node_path_1.default.join(context.knowledgeRoot, "reference-roots.ado.json"),
            node_path_1.default.join(context.knowledgeRoot, "reference-suite-corpus.json"),
            node_path_1.default.join(context.knowledgeRoot, "reference-harvest-status.json")
        ]
    });
    if (!template.exists) {
        (0, fs_1.writeJson)(extractionPlanArtifactPath, {
            status: "blocked",
            reason: "Referenced Excel template file was not found.",
            resolvedTemplatePath: template.path,
            requiredInputs: ["templatePath"]
        });
        return {
            key: "loadReferences",
            status: "blocked",
            summary: "Reference intake is blocked because the referenced Excel template file does not exist.",
            artifactPaths: [intakeArtifactPath, extractionPlanArtifactPath],
            nextAction: `Place the template at ${template.path} or update templatePath in the story run input.`
        };
    }
    (0, fs_1.writeJson)(extractionPlanArtifactPath, {
        status: "ready",
        project: context.input.project || "Cadency",
        roots: referenceRoots,
        uniquePlanIds,
        traversal: {
            recursive: true,
            includeParentSuites: true,
            includeChildSuites: true,
            includeLeafSuites: true,
            includeManualSteps: true,
            includeTitles: true,
            includeExpectedResults: true
        },
        plannedArtifacts: [
            "reference-suite-tree.json",
            "reference-testcase-corpus.json",
            "reference-pattern-summary.json"
        ],
        extractionRules: [
            "Treat every provided plan or suite as a root node.",
            "Traverse all descendant child suites instead of stopping at the parent level.",
            "Prefer direct ADO / Visual Studio data over local cache artifacts.",
            "Use harvested testcases for style, coverage, and domain behavior only."
        ]
    });
    return {
        key: "loadReferences",
        status: "completed",
        summary: `Prepared the recursive ADO reference extraction plan using ${referenceRoots.length} root sources across ${uniquePlanIds.length} plan(s).`,
        artifactPaths: [intakeArtifactPath, extractionPlanArtifactPath]
    };
}
