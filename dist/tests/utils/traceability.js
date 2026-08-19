"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyForAutomation = slugifyForAutomation;
exports.buildAutomationScenarioKey = buildAutomationScenarioKey;
exports.buildAutomationScenarioTitle = buildAutomationScenarioTitle;
exports.buildAutomationFeatureFileName = buildAutomationFeatureFileName;
exports.buildAutomationFeatureRelativePath = buildAutomationFeatureRelativePath;
exports.buildGeneratedSpecRelativePath = buildGeneratedSpecRelativePath;
exports.buildAutomationLookupTokens = buildAutomationLookupTokens;
exports.buildAutomationTags = buildAutomationTags;
function slugifyForAutomation(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}
function buildAutomationScenarioKey(testCaseId, title, fallbackKey) {
    const slug = slugifyForAutomation(title) || "scenario";
    if (testCaseId && Number.isFinite(testCaseId)) {
        return `${testCaseId}-${slug}`;
    }
    return fallbackKey || slug;
}
function buildAutomationScenarioTitle(testCaseId, title, fallbackLabel) {
    const cleanTitle = String(title || "").replace(/\s+/g, " ").trim();
    if (testCaseId && Number.isFinite(testCaseId)) {
        return `${testCaseId}: ${cleanTitle}`;
    }
    return fallbackLabel ? `${fallbackLabel}: ${cleanTitle}` : cleanTitle;
}
function buildAutomationFeatureFileName(testCaseId, title, fallbackKey) {
    const key = buildAutomationScenarioKey(testCaseId, title, fallbackKey);
    return `${key}.feature`;
}
function buildAutomationFeatureRelativePath(workItemId, testCaseId, title, fallbackKey) {
    return `tests/bdd/features/generated/${workItemId}/${buildAutomationFeatureFileName(testCaseId, title, fallbackKey)}`;
}
function buildGeneratedSpecRelativePath(workItemId, testCaseId, title, fallbackKey) {
    const key = buildAutomationScenarioKey(testCaseId, title, fallbackKey);
    return `.features-gen/tests/bdd/features/generated/${workItemId}/${key}.feature.spec.js`;
}
function buildAutomationLookupTokens(input) {
    const title = String(input.title || "").replace(/\s+/g, " ").trim();
    const tokens = [
        `story:${input.workItemId}`,
        `suite:${input.suiteId}`,
        `plan:${input.testPlanId}`,
        title
    ];
    if (input.testCaseId && Number.isFinite(input.testCaseId)) {
        tokens.unshift(`tc:${input.testCaseId}`, String(input.testCaseId));
    }
    return Array.from(new Set(tokens.filter(Boolean)));
}
function buildAutomationTags(input) {
    const tags = [
        `@story-${input.workItemId}`,
        `@suite-${input.suiteId}`,
        `@plan-${input.testPlanId}`
    ];
    if (input.testCaseId && Number.isFinite(input.testCaseId)) {
        tags.push(`@tc-${input.testCaseId}`);
    }
    return Array.from(new Set([...(input.extraTags || []), ...tags]));
}
