"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGeneratedStory = executeGeneratedStory;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const automation_manifest_1 = require("../../tests/utils/automation-manifest");
const ado_client_1 = require("../../tests/utils/ado-client");
const generated_scenario_1 = require("../../tests/utils/generated-scenario");
const execution_summary_1 = require("../../tests/utils/execution-summary");
const workbook_parser_1 = require("../../tests/utils/workbook-parser");
const fs_1 = require("../utils/fs");
function ensureDir(dirPath) {
    node_fs_1.default.mkdirSync(dirPath, { recursive: true });
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
function getNpxCommand() {
    return process.platform === "win32" ? "npx.cmd" : "npx";
}
function quoteWindowsArg(value) {
    if (!/[\s"&<>|^]/.test(value)) {
        return value;
    }
    return `"${value.replace(/"/g, '\\"')}"`;
}
async function runCommand(command, args, cwd, extraEnv = {}) {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            ...extraEnv
        };
        const child = process.platform === "win32"
            ? (0, node_child_process_1.spawn)("cmd.exe", ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")], {
                cwd,
                env,
                stdio: "inherit"
            })
            : (0, node_child_process_1.spawn)(command, args, {
                cwd,
                env,
                stdio: "inherit"
            });
        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 1));
    });
}
function toCounts(results) {
    return {
        passed: results.filter((item) => item.outcome === "Passed").length,
        failed: results.filter((item) => item.outcome === "Failed").length,
        blocked: results.filter((item) => item.outcome === "Blocked").length
    };
}
function mapGeneratedResultToCaseSummary(result) {
    return {
        testCaseId: result.testCaseId,
        title: result.title,
        suiteId: result.suiteId,
        testPlanId: result.testPlanId,
        outcome: result.outcome,
        comment: result.comment,
        classification: result.classification,
        failedStep: result.failedStep,
        artifactPaths: result.artifactPaths
    };
}
function normalizeSuiteCaseMap(suiteCases) {
    const map = new Map();
    for (const suiteCase of suiteCases) {
        map.set((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(suiteCase.title), suiteCase);
    }
    return map;
}
function validateManifestIdentity(context, manifest) {
    if (manifest.workItemId !== context.input.workItemId) {
        throw new Error(`Execution manifest/story mismatch. Manifest story ${manifest.workItemId} does not match current story ${context.input.workItemId}.`);
    }
    if (manifest.suiteId !== context.input.suiteId) {
        throw new Error(`Execution manifest/suite mismatch. Manifest suite ${manifest.suiteId} does not match current suite ${context.input.suiteId}.`);
    }
    if (manifest.testPlanId !== context.input.testPlanId) {
        throw new Error(`Execution manifest/plan mismatch. Manifest plan ${manifest.testPlanId} does not match current plan ${context.input.testPlanId}.`);
    }
}
function validateManifestAgainstSuite(context, manifest, suiteCases) {
    const suiteCaseMap = normalizeSuiteCaseMap(suiteCases);
    const manifestTitles = manifest.scenarios.map((scenario) => (0, workbook_parser_1.normalizeWorkbookTitleForLookup)(scenario.title));
    const matchedTitles = manifestTitles.filter((title) => suiteCaseMap.has(title));
    if (manifestTitles.length === 0) {
        throw new Error("Execution manifest contains no scenarios.");
    }
    if (matchedTitles.length === 0) {
        throw new Error(`Execution suite mismatch. None of the generated scenarios for story ${context.input.workItemId} match titles in suite ${context.input.suiteId}.`);
    }
    if (matchedTitles.length !== manifestTitles.length) {
        const missing = manifest.scenarios
            .filter((scenario) => !suiteCaseMap.has((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(scenario.title)))
            .map((scenario) => scenario.title);
        throw new Error(`Execution manifest does not fully match the uploaded ADO suite for story ${context.input.workItemId}. Missing titles: ${missing.join(" | ")}`);
    }
}
function validateManifestAgainstUploadSummary(context, manifest) {
    const uploadSummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "upload-summary.json");
    if (!node_fs_1.default.existsSync(uploadSummaryPath)) {
        throw new Error(`Upload summary was not found for story ${context.input.workItemId}.`);
    }
    const uploadSummary = (0, fs_1.readJson)(uploadSummaryPath);
    const uploadedCases = (uploadSummary.createdCaseMap || []).filter((entry) => entry?.testCaseId && entry?.title);
    if (uploadedCases.length === 0) {
        throw new Error(`Upload summary for story ${context.input.workItemId} does not contain uploaded testcase mappings.`);
    }
    const manifestIds = new Set(manifest.scenarios.map((scenario) => scenario.testCaseId).filter((value) => Number.isFinite(value)));
    const uploadedIds = new Set(uploadedCases.map((entry) => entry.testCaseId));
    if (manifestIds.size !== uploadedIds.size) {
        throw new Error(`Execution manifest/upload mismatch. Manifest has ${manifestIds.size} testcase IDs but upload summary has ${uploadedIds.size}.`);
    }
    for (const uploadedCase of uploadedCases) {
        if (!manifestIds.has(uploadedCase.testCaseId)) {
            throw new Error(`Execution manifest/upload mismatch. Uploaded testcase ${uploadedCase.testCaseId} (${uploadedCase.title}) is missing from the execution manifest.`);
        }
    }
}
function selectTargetScenarios(context, manifest) {
    if (!context.input.testCaseId) {
        return manifest.scenarios;
    }
    const matching = manifest.scenarios.filter((scenario) => scenario.testCaseId === context.input.testCaseId);
    if (matching.length === 0) {
        throw new Error(`Execution testcase mismatch. Testcase ${context.input.testCaseId} was not found in the current story manifest for story ${context.input.workItemId}.`);
    }
    return matching;
}
async function enrichManifestWithSuiteIds(context, manifestPath) {
    const manifest = (0, automation_manifest_1.readAutomationManifest)(manifestPath);
    validateManifestIdentity(context, manifest);
    validateManifestAgainstUploadSummary(context, manifest);
    const suiteCases = await (0, ado_client_1.fetchSuiteCases)(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
    validateManifestAgainstSuite(context, manifest, suiteCases);
    const suiteCaseMap = normalizeSuiteCaseMap(suiteCases);
    let changed = false;
    for (const scenario of manifest.scenarios) {
        if (scenario.testCaseId) {
            continue;
        }
        const mapped = suiteCaseMap.get((0, workbook_parser_1.normalizeWorkbookTitleForLookup)(scenario.title));
        if (!mapped) {
            continue;
        }
        scenario.testCaseId = mapped.id;
        if (!scenario.tags.includes(`@tc-${mapped.id}`)) {
            scenario.tags.push(`@tc-${mapped.id}`);
        }
        if (!scenario.lookupTokens.includes(String(mapped.id))) {
            scenario.lookupTokens.unshift(String(mapped.id), `tc:${mapped.id}`);
            scenario.lookupTokens = Array.from(new Set(scenario.lookupTokens));
        }
        changed = true;
    }
    if (changed) {
        (0, fs_1.writeJson)(manifestPath, manifest);
        (0, fs_1.writeJson)(node_path_1.default.join(node_path_1.default.dirname(manifestPath), "story-automation-traceability-index.json"), (0, automation_manifest_1.buildTraceabilityIndex)(manifest));
    }
    return manifest;
}
function buildFallbackResult(context, manifest, scenarioKey) {
    const scenario = manifest.scenarios.find((item) => item.key === scenarioKey);
    if (!scenario) {
        throw new Error(`Scenario ${scenarioKey} was not found in manifest.`);
    }
    return {
        generatedAt: new Date().toISOString(),
        workItemId: context.input.workItemId,
        suiteId: context.input.suiteId,
        testPlanId: context.input.testPlanId,
        testCaseId: scenario.testCaseId,
        scenarioKey: scenario.key,
        scenarioTitle: scenario.scenarioTitle,
        title: scenario.title,
        testStatus: "missing",
        outcome: "Failed",
        classification: "automation-issue",
        comment: "No execution result file was produced for this generated scenario.",
        artifactPaths: []
    };
}
function loadScenarioResults(context, manifest, targetScenarios) {
    return targetScenarios.map((scenario) => {
        const filePath = (0, generated_scenario_1.getGeneratedScenarioResultPath)(context.projectRoot, context.input.workItemId, scenario.key);
        if (!node_fs_1.default.existsSync(filePath)) {
            const fallback = buildFallbackResult(context, manifest, scenario.key);
            (0, generated_scenario_1.writeGeneratedScenarioResultFile)(filePath, fallback);
            return fallback;
        }
        return (0, generated_scenario_1.readGeneratedScenarioResultFile)(filePath);
    });
}
async function executeGeneratedStory(context) {
    const manifestPath = node_path_1.default.join(context.storyArtifactsRoot, "automation", "story-automation-manifest.json");
    if (!node_fs_1.default.existsSync(manifestPath)) {
        throw new Error(`Story automation manifest was not found: ${manifestPath}`);
    }
    const skipAdoPublish = process.env.STLCFLOW_SKIP_ADO_PUBLISH === "1";
    const executionResultsDir = (0, generated_scenario_1.getGeneratedScenarioResultsDir)(context.projectRoot, context.input.workItemId);
    removeDirectoryIfPresent(executionResultsDir, node_path_1.default.join(context.projectRoot, "artifacts", "stories"));
    ensureDir(executionResultsDir);
    removeDirectoryIfPresent(node_path_1.default.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated", String(context.input.workItemId)), node_path_1.default.join(context.projectRoot, ".features-gen", "tests", "bdd", "features", "generated"));
    removeDirectoryIfPresent(node_path_1.default.join(context.projectRoot, ".features-gen", "automation", "features", "generated", String(context.input.workItemId)), node_path_1.default.join(context.projectRoot, ".features-gen", "automation", "features", "generated"));
    const manifest = await enrichManifestWithSuiteIds(context, manifestPath);
    const targetScenarios = selectTargetScenarios(context, manifest);
    const bddgenExitCode = await runCommand(getNpxCommand(), ["bddgen"], context.projectRoot);
    if (bddgenExitCode !== 0) {
        throw new Error(`BDD generation failed with exit code ${bddgenExitCode}.`);
    }
    const grepTarget = context.input.testCaseId ? `@tc-${context.input.testCaseId}` : `@story-${context.input.workItemId}`;
    const playwrightExitCode = await runCommand(getNpxCommand(), ["playwright", "test", "--grep", grepTarget], context.projectRoot, {
        PW_HEADLESS: process.env.PW_HEADLESS || "1"
    });
    const scenarioResults = loadScenarioResults(context, manifest, targetScenarios);
    if (playwrightExitCode !== 0 && scenarioResults.every((item) => item.testStatus === "missing")) {
        throw new Error(`Playwright execution failed before any generated scenario results were produced. Exit code: ${playwrightExitCode}.`);
    }
    const caseSummaries = scenarioResults.map(mapGeneratedResultToCaseSummary);
    const counts = toCounts(caseSummaries);
    let runId;
    let runCompletionWarning;
    let publishedResultCount = 0;
    const publishable = scenarioResults.filter((item) => item.testCaseId);
    if (!skipAdoPublish && publishable.length > 0) {
        const suiteCases = await (0, ado_client_1.fetchSuiteCases)(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
        const suitePoints = await (0, ado_client_1.fetchSuitePoints)(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
        const executablePointIds = suitePoints
            .filter((point) => publishable.some((item) => item.testCaseId === point.testCaseId))
            .map((point) => point.pointId);
        if (executablePointIds.length > 0) {
            const run = await (0, ado_client_1.createTestRun)(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId, executablePointIds, context.input.workItemId);
            runId = run.runId;
            const published = await (0, ado_client_1.publishTestResults)(run.runId, context.input.project || "Cadency", suiteCases, suitePoints, publishable.map((item) => ({
                testCaseId: item.testCaseId,
                title: item.title,
                outcome: item.outcome,
                comment: item.comment,
                errorMessage: item.failedStep?.error,
                stackTrace: item.failedStep?.actual
            })));
            publishedResultCount = published.length;
            runCompletionWarning =
                (await (0, ado_client_1.completeTestRun)(run.runId, context.input.project || "Cadency", `STLCFlow execution completed. Passed: ${counts.passed}. Failed: ${counts.failed}. Blocked: ${counts.blocked}.`)) || undefined;
        }
    }
    const executionSummary = (0, execution_summary_1.buildExecutionSummaryFile)({
        workItemId: context.input.workItemId,
        suiteId: context.input.suiteId,
        testPlanId: context.input.testPlanId,
        runId,
        runCompletionWarning,
        results: caseSummaries
    });
    const executionSummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "execution-summary.json");
    (0, execution_summary_1.writeExecutionSummary)(executionSummaryPath, executionSummary);
    const publicationSummaryPath = node_path_1.default.join(context.storyArtifactsRoot, "ado-result-publication.json");
    (0, fs_1.writeJson)(publicationSummaryPath, {
        project: context.input.project || "Cadency",
        testPlanId: context.input.testPlanId,
        suiteId: context.input.suiteId,
        runId,
        skippedPublish: skipAdoPublish,
        publishedResultCount,
        unpublishedScenarioCount: scenarioResults.filter((item) => !item.testCaseId).length,
        runCompletionWarning
    });
    const executionRuntimePath = node_path_1.default.join(context.storyArtifactsRoot, "execution-runtime.json");
    (0, fs_1.writeJson)(executionRuntimePath, {
        manifestPath,
        playwrightExitCode,
        counts
    });
    const reportExitCode = await runCommand(getNpxCommand(), ["allure", "generate", "./artifacts/allure-results", "--output", "./artifacts/allure-report"], context.projectRoot);
    if (reportExitCode !== 0) {
        throw new Error(`Allure report generation failed with exit code ${reportExitCode}.`);
    }
    return {
        artifactPaths: [executionSummaryPath, publicationSummaryPath, executionRuntimePath, node_path_1.default.join(context.projectRoot, "artifacts", "allure-report")],
        executionSummaryPath,
        reportPath: node_path_1.default.join(context.projectRoot, "artifacts", "allure-report"),
        counts,
        publishedResultCount,
        runId
    };
}
