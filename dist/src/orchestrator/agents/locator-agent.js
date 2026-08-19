"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locatorAgent = void 0;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../../utils/fs");
const workbook_conventions_1 = require("../workbook-conventions");
exports.locatorAgent = {
    prepareLocatorStrategy(context) {
        const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "locator-generation-plan.json");
        (0, fs_1.writeJson)(artifactPath, {
            agent: "Locator Agent",
            sourceOfTruth: {
                approvedWorkbook: (0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input)?.path || "",
                uiEvidencePlan: node_path_1.default.join(context.storyArtifactsRoot, "ui-evidence-plan.json"),
                storySummary: node_path_1.default.join(context.storyArtifactsRoot, "story-summary.json")
            },
            locatorRanking: [
                "role and accessible name",
                "label and placeholder",
                "test id or stable application attribute",
                "visible text scoped by region",
                "CSS selector only when no user-facing or stable attribute exists"
            ],
            fallbackPolicy: [
                "Prefer Playwright locators that describe user intent.",
                "Scope locators to pages, dialogs, grids, or rows before matching text.",
                "Do not generate brittle absolute XPath selectors.",
                "Record locator uncertainty in scenario data instead of pretending a selector is verified."
            ],
            handoffToFrameworkAgent: {
                expectedConsumers: [
                    "tests/pages",
                    "tests/bdd/steps/generated-scenario.steps.ts",
                    "tests/utils/scenario-runner.ts",
                    "tests/data/generated/<storyId>"
                ],
                generatedArtifactsShouldReferenceTestCaseId: true
            }
        });
        return artifactPath;
    }
};
