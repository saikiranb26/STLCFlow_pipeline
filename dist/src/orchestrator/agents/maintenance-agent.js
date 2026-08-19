"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceAgent = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const story_execution_1 = require("../story-execution");
const fs_1 = require("../../utils/fs");
const workbook_conventions_1 = require("../workbook-conventions");
exports.maintenanceAgent = {
    async executeTests(context) {
        const manifestPath = node_path_1.default.join(context.storyArtifactsRoot, "automation", "story-automation-manifest.json");
        const maintenancePlanPath = node_path_1.default.join(context.storyArtifactsRoot, "maintenance-plan.json");
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "execution-plan.json");
        (0, fs_1.writeJson)(maintenancePlanPath, {
            agent: "Maintenance Agent",
            scope: {
                workItemId: context.input.workItemId,
                suiteId: context.input.suiteId,
                testPlanId: context.input.testPlanId,
                manifestPath
            },
            selfHealingPolicy: [
                "Do not mark a case passed from assumptions.",
                "Classify failure cause before changing framework code.",
                "Prefer stable locator or page-object improvements over generated scenario rewrites.",
                "Keep traceability by testcase ID when refactoring generated files."
            ],
            failureClassifications: [
                "product bug",
                "automation issue",
                "environment or data issue",
                "blocked by unsupported workflow state"
            ]
        });
        (0, fs_1.writeJson)(artifactPath, {
            agent: "Maintenance Agent",
            mainRunner: "Playwright Test + Playwright browser engine",
            orchestrationSupport: "Playwright MCP",
            secondaryDebugLayer: "Chrome DevTools MCP",
            frameworkEntryPoints: {
                config: node_path_1.default.join(context.projectRoot, "playwright.config.ts"),
                authBootstrap: node_path_1.default.join(context.projectRoot, "tests", "utils", "bootstrap-auth.ts"),
                frameworkHealthFeature: node_path_1.default.join(context.projectRoot, "tests", "bdd", "features", "framework-health.feature")
            },
            storyManifestPath: manifestPath,
            resultPolicy: {
                allowAssumptionBasedPass: false,
                onUnsupportedScenario: "block-or-fail-with-reason",
                publishToAdo: true
            }
        });
        if (!(0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input)) {
            return {
                key: "executeTests",
                agentKey: "maintenance",
                status: "blocked",
                summary: "Maintenance Agent is blocked because the approved workbook could not be resolved.",
                artifactPaths: [maintenancePlanPath, artifactPath],
                nextAction: `Save the approved workbook under ${node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel")} or provide approvedWorkbookPath explicitly before generating or running automation.`
            };
        }
        if (!node_fs_1.default.existsSync(manifestPath)) {
            return {
                key: "executeTests",
                agentKey: "maintenance",
                status: "blocked",
                summary: "Maintenance Agent is blocked because the story automation manifest does not exist yet.",
                artifactPaths: [maintenancePlanPath, artifactPath],
                nextAction: "Complete the automation generation stage so story-automation-manifest.json exists for this story."
            };
        }
        const execution = await (0, story_execution_1.executeGeneratedStory)(context);
        return {
            key: "executeTests",
            agentKey: "maintenance",
            status: "completed",
            summary: `Maintenance Agent executed generated automation. Passed: ${execution.counts.passed}, Failed: ${execution.counts.failed}, Blocked: ${execution.counts.blocked}, Published: ${execution.publishedResultCount}.`,
            artifactPaths: [maintenancePlanPath, artifactPath, ...execution.artifactPaths]
        };
    },
    async publishReport(context) {
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "reporting-plan.json");
        const reportPath = node_path_1.default.join(context.projectRoot, "artifacts", "allure-report");
        (0, fs_1.writeJson)(artifactPath, {
            agent: "Maintenance Agent",
            reporters: [
                "line",
                "allure-playwright"
            ],
            expectedOutputs: [
                node_path_1.default.join(context.projectRoot, "artifacts", "allure-results"),
                node_path_1.default.join(context.projectRoot, "artifacts", "allure-report"),
                node_path_1.default.join(context.projectRoot, "artifacts", "test-output"),
                node_path_1.default.join(context.storyArtifactsRoot, "execution-summary.json")
            ],
            failedCaseSummary: [
                "testcase ID",
                "testcase title",
                "suite ID",
                "test plan ID",
                "failed step",
                "expected result",
                "actual result",
                "error details",
                "artifact paths"
            ]
        });
        if (!node_fs_1.default.existsSync(reportPath)) {
            return {
                key: "publishReport",
                agentKey: "maintenance",
                status: "blocked",
                summary: "Maintenance Agent did not find Allure report output after execution.",
                artifactPaths: [artifactPath],
                nextAction: "Run the execution stage successfully so it produces artifacts/allure-report."
            };
        }
        return {
            key: "publishReport",
            agentKey: "maintenance",
            status: "completed",
            summary: "Maintenance Agent confirmed Allure report output is present for the executed automation run.",
            artifactPaths: [artifactPath, reportPath]
        };
    }
};
