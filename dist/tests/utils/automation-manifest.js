"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAutomationManifest = readAutomationManifest;
exports.normalizeScenarioTraceability = normalizeScenarioTraceability;
exports.buildTraceabilityIndex = buildTraceabilityIndex;
const node_fs_1 = __importDefault(require("node:fs"));
const traceability_1 = require("./traceability");
function readAutomationManifest(filePath) {
    return JSON.parse(node_fs_1.default.readFileSync(filePath, "utf8"));
}
function normalizeScenarioTraceability(input) {
    const key = (0, traceability_1.buildAutomationScenarioKey)(input.testCaseId, input.title, input.fallbackKey);
    const scenarioTitle = (0, traceability_1.buildAutomationScenarioTitle)(input.testCaseId, input.title, input.fallbackLabel);
    const featureFile = input.featureFile || (0, traceability_1.buildAutomationFeatureRelativePath)(input.workItemId, input.testCaseId, input.title, input.fallbackKey);
    const generatedSpecFile = input.generatedSpecFile ||
        (0, traceability_1.buildGeneratedSpecRelativePath)(input.workItemId, input.testCaseId, input.title, input.fallbackKey);
    const lookupTokens = (0, traceability_1.buildAutomationLookupTokens)({
        workItemId: input.workItemId,
        suiteId: input.suiteId,
        testPlanId: input.testPlanId,
        testCaseId: input.testCaseId,
        title: input.title
    });
    return {
        caseOrdinal: input.caseOrdinal,
        key,
        title: input.title,
        testCaseId: input.testCaseId,
        tags: input.tags || [],
        featureFile,
        scenarioTitle,
        generatedSpecFile,
        lookupTokens,
        navigationPath: input.navigationPath,
        manualSteps: input.manualSteps || [],
        executionSteps: input.executionSteps || []
    };
}
function buildTraceabilityIndex(manifest) {
    return {
        workItemId: manifest.workItemId,
        suiteId: manifest.suiteId,
        testPlanId: manifest.testPlanId,
        generatedAt: manifest.generatedAt,
        entries: manifest.scenarios.map((scenario) => ({
            caseOrdinal: scenario.caseOrdinal,
            testCaseId: scenario.testCaseId,
            title: scenario.title,
            scenarioKey: scenario.key,
            scenarioTitle: scenario.scenarioTitle,
            featureFile: scenario.featureFile,
            generatedSpecFile: scenario.generatedSpecFile,
            lookupTokens: scenario.lookupTokens
        }))
    };
}
