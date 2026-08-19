"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameworkAgent = void 0;
const node_path_1 = __importDefault(require("node:path"));
const automation_generation_1 = require("../automation-generation");
const fs_1 = require("../../utils/fs");
const workbook_conventions_1 = require("../workbook-conventions");
exports.frameworkAgent = {
    async generateAutomation(context, locatorPlanPath) {
        const storyAutomationRoot = node_path_1.default.join(context.storyArtifactsRoot, "automation");
        (0, fs_1.ensureDir)(storyAutomationRoot);
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "automation-generation-plan.json");
        (0, fs_1.writeJson)(artifactPath, {
            agent: "Framework Agent",
            collaboratingAgents: ["Locator Agent"],
            framework: {
                language: "TypeScript",
                runner: "Playwright",
                style: "BDD",
                configFiles: [
                    "playwright.config.ts",
                    ".vscode/playwright-mcp.config.json",
                    "tests/bdd/fixtures/test.ts",
                    "tests/bdd/steps/bdd.ts"
                ]
            },
            sourceOfTruth: {
                reviewedWorkbook: (0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input)?.path || "",
                expectedWorkbookPath: (0, workbook_conventions_1.getExpectedWorkbookPath)(context.projectRoot, context.input),
                locatorPlanPath,
                requiredInputs: [
                    "approved workbook in artifacts/generated-excel or explicit override",
                    "sidecar metadata",
                    "reference knowledge",
                    "playwright evidence when available",
                    "locator strategy from Locator Agent"
                ]
            },
            storyArtifacts: {
                manifestPath: node_path_1.default.join(storyAutomationRoot, "story-automation-manifest.json"),
                traceabilityIndexPath: node_path_1.default.join(storyAutomationRoot, "story-automation-traceability-index.json"),
                generatedFeatureRoot: node_path_1.default.join(context.testsRoot, "bdd", "features", "generated", String(context.input.workItemId)),
                generatedDataRoot: node_path_1.default.join(context.testsRoot, "data", "generated", String(context.input.workItemId)),
                generatedSpecRoot: node_path_1.default.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated", String(context.input.workItemId))
            },
            traceabilityContract: {
                featureFileName: "<testCaseId>-<slug>.feature",
                generatedSpecName: "<testCaseId>-<slug>.feature.spec.js",
                scenarioTitle: "<testCaseId>: <testcase title>",
                testcaseTag: "@tc-<testCaseId>",
                storyTag: "@story-<workItemId>",
                suiteTag: "@suite-<suiteId>",
                planTag: "@plan-<testPlanId>",
                lookupIndex: "artifacts/stories/<storyId>/automation/story-automation-traceability-index.json"
            },
            executionRule: [
                "Generate automation only from the approved workbook and sidecar metadata.",
                "Keep story-specific generated code in draft storage until the testcase executes reliably.",
                "Do not hardcode story behavior into the shared framework.",
                "Use Playwright as the execution engine and ADO/API for result publication.",
                "Every generated testcase must be traceable by testcase ID, scenario title, feature file, and generated spec path."
            ],
            frameworkFolders: [
                "approved workbook",
                "tests/bdd/features",
                "tests/bdd/steps",
                "tests/pages",
                "tests/bdd/fixtures",
                "tests/utils",
                "tests/data",
                "tests/bdd/hooks"
            ]
        });
        if (!(0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input)) {
            return {
                key: "generateAutomation",
                agentKey: "framework",
                status: "blocked",
                summary: "Framework Agent is blocked because the approved workbook could not be resolved.",
                artifactPaths: [artifactPath, locatorPlanPath],
                nextAction: `Save the reviewed workbook under ${node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel")} using the story name or work item ID, or provide approvedWorkbookPath explicitly.`
            };
        }
        const generated = await (0, automation_generation_1.generateAutomationArtifacts)(context);
        return {
            key: "generateAutomation",
            agentKey: "framework",
            status: "completed",
            summary: `Framework Agent generated ${generated.scenarioCount} story-specific automation scenario files, feature files, and traceability artifacts from the approved workbook.`,
            artifactPaths: [artifactPath, locatorPlanPath, ...generated.artifactPaths]
        };
    }
};
