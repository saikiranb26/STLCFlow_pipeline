"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAutomationArtifacts = generateAutomationArtifacts;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const automation_manifest_1 = require("../../tests/utils/automation-manifest");
const navigation_inference_1 = require("../../tests/utils/navigation-inference");
const traceability_1 = require("../../tests/utils/traceability");
const ado_client_1 = require("../../tests/utils/ado-client");
const scenario_inference_1 = require("../../tests/utils/scenario-inference");
const workbook_parser_1 = require("../../tests/utils/workbook-parser");
const fs_1 = require("../utils/fs");
const workbook_conventions_1 = require("./workbook-conventions");
function toPosixPath(value) {
    return value.replace(/\\/g, "/");
}
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function removeDirectoryIfPresent(targetPath, expectedRoot) {
    const resolvedTarget = node_path_1.default.resolve(targetPath);
    const resolvedRoot = node_path_1.default.resolve(expectedRoot);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
        throw new Error(`Refusing to remove directory outside expected root: ${resolvedTarget}`);
    }
    if (node_fs_1.default.existsSync(resolvedTarget)) {
        node_fs_1.default.rmSync(resolvedTarget, { recursive: true, force: true });
    }
}
function normalizeSuiteCaseMap(suiteCases) {
    const map = new Map();
    for (const suiteCase of suiteCases) {
        map.set((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(suiteCase.title), suiteCase);
    }
    return map;
}
function buildFeatureFileContents(input) {
    const manualComments = input.manualSteps
        .map((step, index) => {
        const parts = [`# Step ${index + 1}: ${step.action || "(no action text)"}`];
        if (step.expected) {
            parts.push(`# Expected ${index + 1}: ${step.expected}`);
        }
        return parts.join("\n");
    })
        .join("\n");
    return [
        input.tags.join(" "),
        `Feature: Story ${input.workItemId} generated automation`,
        `  # Source testcase title: ${input.title}`,
        ...(manualComments ? [manualComments] : []),
        `  Scenario: ${input.scenarioTitle}`,
        `    Given the generated scenario file "${input.scenarioDataRelativePath}" is loaded`,
        `    When I execute the generated scenario`,
        `    Then the generated scenario should finish without blockers`,
        ""
    ].join("\n");
}
function inferGeneratedFeatureName(title, navigationPath) {
    const normalizedNavigation = clean(navigationPath || "");
    if (/legacy reports/i.test(normalizedNavigation) || /legacy reports/i.test(title)) {
        return "LegacyReports";
    }
    if (/scheduler|recurring tasks|import/i.test(normalizedNavigation) || /scheduler|recurring tasks|import/i.test(title)) {
        return "Scheduler";
    }
    return "GeneratedAutomation";
}
function inferGeneratedFeatureTags(title, navigationPath) {
    const tags = [];
    const normalizedNavigation = clean(navigationPath || "");
    if (/legacy reports/i.test(normalizedNavigation) || /legacy reports/i.test(title)) {
        tags.push("@LegacyReports");
    }
    if (/scheduler|recurring tasks|import/i.test(normalizedNavigation) || /scheduler|recurring tasks|import/i.test(title)) {
        tags.push("@Scheduler");
    }
    return tags;
}
function buildBusinessGherkinSteps(executionSteps, title) {
    const retainedStateText = (() => {
        const normalizedTitle = clean(title).toLowerCase();
        if (normalizedTitle.includes("page number and page size")) {
            return "I verify the Legacy Reports page number and page size are retained";
        }
        if (normalizedTitle.includes("page size")) {
            return "I verify the Legacy Reports page size is retained";
        }
        return "I verify the Legacy Reports page number is retained";
    })();
    const rows = [];
    for (let index = 0; index < executionSteps.length; index += 1) {
        const step = executionSteps[index];
        const remainingKinds = executionSteps.slice(index + 1).map((item) => item.kind);
        const hasFutureRetainedAssertion = remainingKinds.includes("legacyReportsAssertRetainedState");
        switch (step.kind) {
            case "login":
                rows.push({ keyword: "Given", text: "I login to Match" });
                break;
            case "gotoLegacyReports":
                rows.push({ keyword: "When", text: "I open the Legacy Reports page" });
                break;
            case "legacyReportsEnsurePaginationAvailable":
                rows.push({ keyword: "When", text: "I ensure the Legacy Reports list has more than one page" });
                break;
            case "legacyReportsGoToPage":
                rows.push({ keyword: "When", text: `I go to page '${clean(step.value || "")}' on Legacy Reports` });
                break;
            case "legacyReportsSetPageSize":
                rows.push({ keyword: "When", text: "I set the Legacy Reports page size to a supported value" });
                break;
            case "legacyReportsOpenActions":
                rows.push({ keyword: "When", text: "I open the Actions menu for a report on Legacy Reports" });
                break;
            case "legacyReportsAssertActionsMenu":
                rows.push({ keyword: "Then", text: "I verify the Legacy Reports Actions menu shows 'Move, Duplicate, Download, Delete'" });
                break;
            case "legacyReportsSelectAction":
                rows.push({ keyword: "When", text: `I select the '${clean(step.value || "")}' action from the Legacy Reports Actions menu` });
                break;
            case "legacyReportsCompleteFolderAction":
                rows.push({ keyword: "When", text: `I choose the '${clean(step.value || "")}' folder and save the Legacy Reports action` });
                break;
            case "legacyReportsConfirmDelete":
                rows.push({ keyword: "When", text: "I confirm the Legacy Reports delete action" });
                break;
            case "legacyReportsReturnToList":
                rows.push({ keyword: "When", text: "I return to the Legacy Reports list" });
                if (!hasFutureRetainedAssertion) {
                    rows.push({ keyword: "Then", text: retainedStateText });
                }
                break;
            case "legacyReportsAssertRetainedState":
                rows.push({ keyword: "Then", text: retainedStateText });
                break;
            case "browserBack":
                rows.push({ keyword: "When", text: "I click the browser Back button" });
                break;
            case "browserForward":
                rows.push({ keyword: "When", text: "I click the browser Forward button" });
                if (!hasFutureRetainedAssertion) {
                    rows.push({ keyword: "Then", text: retainedStateText });
                }
                break;
            default:
                return null;
        }
    }
    return rows.length > 0 && rows.some((row) => row.keyword === "Then") ? rows : null;
}
function buildRepoStyleFeatureFileContents(input) {
    const steps = buildBusinessGherkinSteps(input.executionSteps, input.title);
    if (!steps) {
        return null;
    }
    const featureName = inferGeneratedFeatureName(input.title, input.navigationPath);
    const headerTags = Array.from(new Set([...inferGeneratedFeatureTags(input.title, input.navigationPath), ...input.tags]));
    const scenarioTag = input.testCaseId ? `@${input.testCaseId}` : undefined;
    const titleWithoutStoryId = clean(input.title).replace(new RegExp(`^${input.workItemId}\\s+`), "");
    const scenarioTitle = input.testCaseId
        ? `${input.testCaseId}_${input.workItemId}_${titleWithoutStoryId}`
        : `${input.workItemId}_${titleWithoutStoryId}`;
    return [
        headerTags.join(" "),
        `Feature: ${featureName}`,
        "",
        ...(scenarioTag ? [`  ${scenarioTag}`] : []),
        `  Scenario: ${scenarioTitle}`,
        ...steps.map((step) => `    ${step.keyword} ${step.text}`),
        ""
    ].join("\n");
}
async function generateAutomationArtifacts(context) {
    const resolvedWorkbook = (0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input);
    if (!resolvedWorkbook) {
        throw new Error(`Approved workbook could not be resolved. Place the reviewed workbook under ${node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel")} or provide approvedWorkbookPath explicitly.`);
    }
    const approvedWorkbookPath = resolvedWorkbook.path;
    const parsedWorkbook = (0, workbook_parser_1.parseApprovedWorkbook)(approvedWorkbookPath);
    if (parsedWorkbook.testCases.length === 0) {
        throw new Error(`No testcase rows were found in the approved workbook: ${approvedWorkbookPath}`);
    }
    const storyAutomationRoot = node_path_1.default.join(context.storyArtifactsRoot, "automation");
    const legacyDraftAutomationRoot = node_path_1.default.join(storyAutomationRoot, "draft");
    const generatedFeatureRoot = node_path_1.default.join(context.testsRoot, "bdd", "features", "generated", String(context.input.workItemId));
    const generatedDataRoot = node_path_1.default.join(context.testsRoot, "data", "generated", String(context.input.workItemId));
    const generatedSpecRoot = node_path_1.default.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated", String(context.input.workItemId));
    const legacyGeneratedFeatureRoot = node_path_1.default.join(context.projectRoot, "automation", "features", "generated", String(context.input.workItemId));
    const legacyGeneratedDataRoot = node_path_1.default.join(context.projectRoot, "automation", "data", "generated", String(context.input.workItemId));
    const legacyGeneratedSpecRoot = node_path_1.default.join(context.projectRoot, ".features-gen", "automation", "features", "generated", String(context.input.workItemId));
    const legacyRepoGeneratedStoryRoot = node_path_1.default.join(context.projectRoot, "automation", "stories", String(context.input.workItemId));
    (0, fs_1.ensureDir)(storyAutomationRoot);
    removeDirectoryIfPresent(legacyDraftAutomationRoot, storyAutomationRoot);
    removeDirectoryIfPresent(generatedFeatureRoot, node_path_1.default.join(context.testsRoot, "bdd", "features", "generated"));
    removeDirectoryIfPresent(generatedDataRoot, node_path_1.default.join(context.testsRoot, "data", "generated"));
    removeDirectoryIfPresent(generatedSpecRoot, node_path_1.default.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated"));
    removeDirectoryIfPresent(legacyGeneratedFeatureRoot, node_path_1.default.join(context.projectRoot, "automation", "features", "generated"));
    removeDirectoryIfPresent(legacyGeneratedDataRoot, node_path_1.default.join(context.projectRoot, "automation", "data", "generated"));
    removeDirectoryIfPresent(legacyGeneratedSpecRoot, node_path_1.default.join(context.projectRoot, ".features-gen", "automation", "features", "generated"));
    removeDirectoryIfPresent(legacyRepoGeneratedStoryRoot, node_path_1.default.join(context.projectRoot, "automation", "stories"));
    (0, fs_1.ensureDir)(generatedFeatureRoot);
    (0, fs_1.ensureDir)(generatedDataRoot);
    const warnings = [];
    let suiteCaseMap = new Map();
    try {
        const suiteCases = await (0, ado_client_1.fetchSuiteCases)(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
        suiteCaseMap = normalizeSuiteCaseMap(suiteCases);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Unable to fetch suite cases for traceability mapping: ${message}`);
    }
    const uploadSummaryCaseMap = new Map();
    const orderedUploadedCases = [];
    const uploadSummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "upload-summary.json");
    if (node_fs_1.default.existsSync(uploadSummaryPath)) {
        try {
            const uploadSummary = (0, fs_1.readJson)(uploadSummaryPath);
            for (const entry of uploadSummary.createdCaseMap || []) {
                if (!entry?.testCaseId || !entry.title) {
                    continue;
                }
                orderedUploadedCases.push(entry);
                uploadSummaryCaseMap.set((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(entry.title), entry);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            warnings.push(`Unable to read upload summary testcase mapping: ${message}`);
        }
    }
    if (orderedUploadedCases.length === 0) {
        throw new Error(`Automation generation requires the current story upload mapping. Run upload for story ${context.input.workItemId} first so upload-summary.json contains createdCaseMap entries.`);
    }
    const workbookCaseMap = new Map(parsedWorkbook.testCases.map((testCase) => [(0, workbook_parser_1.normalizeWorkbookTitleForLookup)(testCase.sourceTitle), testCase]));
    const missingWorkbookTitles = orderedUploadedCases
        .filter((entry) => !workbookCaseMap.has((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(entry.title)))
        .map((entry) => entry.title);
    if (missingWorkbookTitles.length > 0) {
        throw new Error(`Approved workbook does not contain all uploaded ADO testcase titles for story ${context.input.workItemId}. Missing workbook titles: ${missingWorkbookTitles.join(" | ")}`);
    }
    const scenarios = orderedUploadedCases.map((uploadedCase) => {
        const testCase = workbookCaseMap.get((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(uploadedCase.title));
        if (!testCase) {
            throw new Error(`Workbook testcase could not be resolved for uploaded title "${uploadedCase.title}".`);
        }
        const normalizedTitle = (0, workbook_parser_1.normalizeWorkbookTitleForLookup)(testCase.sourceTitle);
        const mappedSuiteCase = suiteCaseMap.get(normalizedTitle);
        const mappedUploadCase = uploadSummaryCaseMap.get(normalizedTitle) || uploadedCase;
        const resolvedTestCaseId = mappedUploadCase.testCaseId || mappedSuiteCase?.id;
        const fallbackKey = `case-${String(testCase.caseOrdinal).padStart(3, "0")}-${(0, traceability_1.slugifyForAutomation)(testCase.sourceTitle) || "scenario"}`;
        const scenarioKey = (0, traceability_1.buildAutomationScenarioKey)(resolvedTestCaseId, testCase.sourceTitle, fallbackKey);
        const featureRelativePath = toPosixPath(node_path_1.default.join("tests", "bdd", "features", "generated", String(context.input.workItemId), `${scenarioKey}.feature`));
        const generatedSpecRelativePath = toPosixPath(node_path_1.default.join(".features-gen", "tests", "bdd", "features", "generated", String(context.input.workItemId), `${scenarioKey}.feature.spec.js`));
        const inferredNavigationPath = (0, navigation_inference_1.inferScenarioNavigationPath)({
            explicitNavigationPath: context.input.navigationPath,
            title: testCase.sourceTitle,
            manualSteps: testCase.manualSteps
        });
        const executionSteps = (0, scenario_inference_1.inferExecutionStepsFromManualSteps)({
            manualSteps: testCase.manualSteps,
            navigationPath: inferredNavigationPath
        });
        const uiScenario = (0, scenario_inference_1.isUiScenario)(executionSteps);
        const scenario = (0, automation_manifest_1.normalizeScenarioTraceability)({
            workItemId: context.input.workItemId,
            suiteId: context.input.suiteId,
            testPlanId: context.input.testPlanId,
            caseOrdinal: testCase.caseOrdinal,
            testCaseId: resolvedTestCaseId,
            title: testCase.sourceTitle,
            fallbackKey,
            featureFile: featureRelativePath,
            generatedSpecFile: generatedSpecRelativePath,
            fallbackLabel: `Case ${String(testCase.caseOrdinal).padStart(3, "0")}`,
            tags: (0, traceability_1.buildAutomationTags)({
                workItemId: context.input.workItemId,
                suiteId: context.input.suiteId,
                testPlanId: context.input.testPlanId,
                testCaseId: resolvedTestCaseId,
                extraTags: [uiScenario ? "@ui" : "@nonui", "@generated"]
            }),
            navigationPath: inferredNavigationPath,
            manualSteps: testCase.manualSteps,
            executionSteps
        });
        return scenario;
    });
    const manifest = {
        workItemId: context.input.workItemId,
        suiteId: context.input.suiteId,
        testPlanId: context.input.testPlanId,
        workbookPath: approvedWorkbookPath,
        generatedAt: new Date().toISOString(),
        scenarios
    };
    const artifactPaths = [];
    for (const scenario of manifest.scenarios) {
        const scenarioFileRelativePath = toPosixPath(node_path_1.default.join("tests", "data", "generated", String(context.input.workItemId), `${scenario.key}.scenario.json`));
        const scenarioFileAbsolutePath = node_path_1.default.join(generatedDataRoot, `${scenario.key}.scenario.json`);
        const generatedScenarioFile = {
            workItemId: context.input.workItemId,
            suiteId: context.input.suiteId,
            testPlanId: context.input.testPlanId,
            project: context.input.project || "Cadency",
            workbookPath: approvedWorkbookPath,
            generatedAt: manifest.generatedAt,
            scenario
        };
        (0, fs_1.writeJson)(scenarioFileAbsolutePath, generatedScenarioFile);
        artifactPaths.push(scenarioFileAbsolutePath);
        const featureFileAbsolutePath = node_path_1.default.join(context.projectRoot, scenario.featureFile);
        const featureContents = buildRepoStyleFeatureFileContents({
            workItemId: context.input.workItemId,
            testCaseId: scenario.testCaseId,
            title: scenario.title,
            tags: scenario.tags,
            navigationPath: scenario.navigationPath,
            executionSteps: scenario.executionSteps
        }) ||
            buildFeatureFileContents({
                workItemId: context.input.workItemId,
                scenarioKey: scenario.key,
                scenarioTitle: scenario.scenarioTitle,
                title: scenario.title,
                tags: scenario.tags,
                scenarioDataRelativePath: scenarioFileRelativePath,
                manualSteps: scenario.manualSteps
            });
        (0, fs_1.writeText)(featureFileAbsolutePath, featureContents);
        artifactPaths.push(featureFileAbsolutePath);
    }
    const manifestPath = node_path_1.default.join(storyAutomationRoot, "story-automation-manifest.json");
    const traceabilityIndexPath = node_path_1.default.join(storyAutomationRoot, "story-automation-traceability-index.json");
    const generationSummaryPath = node_path_1.default.join(storyAutomationRoot, "automation-generation-summary.json");
    const generatedFeatureTraceabilityIndexPath = node_path_1.default.join(generatedFeatureRoot, "story-automation-traceability-index.json");
    const generatedDataManifestPath = node_path_1.default.join(generatedDataRoot, "story-automation-manifest.json");
    (0, fs_1.writeJson)(manifestPath, manifest);
    (0, fs_1.writeJson)(traceabilityIndexPath, (0, automation_manifest_1.buildTraceabilityIndex)(manifest));
    (0, fs_1.writeJson)(generationSummaryPath, {
        workbookPath: approvedWorkbookPath,
        workbookResolutionSource: resolvedWorkbook.source,
        generationMode: "uploaded-ado-cases-only",
        sheetName: parsedWorkbook.sheetName,
        scenarioCount: manifest.scenarios.length,
        uploadMappedCases: orderedUploadedCases.length,
        matchedSuiteCases: manifest.scenarios.filter((scenario) => Boolean(scenario.testCaseId)).length,
        unmatchedWorkbookCases: parsedWorkbook.testCases
            .filter((testCase) => !uploadSummaryCaseMap.has((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(testCase.sourceTitle)))
            .map((testCase) => ({ caseOrdinal: testCase.caseOrdinal, title: testCase.sourceTitle })),
        warnings
    });
    (0, fs_1.writeJson)(generatedFeatureTraceabilityIndexPath, (0, automation_manifest_1.buildTraceabilityIndex)(manifest));
    (0, fs_1.writeJson)(generatedDataManifestPath, manifest);
    artifactPaths.push(manifestPath, traceabilityIndexPath, generationSummaryPath, generatedFeatureTraceabilityIndexPath, generatedDataManifestPath);
    return {
        artifactPaths,
        scenarioCount: manifest.scenarios.length,
        warnings
    };
}
