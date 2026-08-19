"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLegacyWorkbookGeneration = runLegacyWorkbookGeneration;
exports.writeStoryArtifactsFromLegacyPayload = writeStoryArtifactsFromLegacyPayload;
exports.runLegacyWorkbookUpload = runLegacyWorkbookUpload;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const ado_client_1 = require("../../tests/utils/ado-client");
const workbook_parser_1 = require("../../tests/utils/workbook-parser");
const fs_1 = require("../utils/fs");
function normalizeTitleForLookup(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
function getLegacyProjectRoot(projectRoot) {
    return node_path_1.default.resolve(projectRoot, "..", "AdoMCPtestcasesUpload");
}
function runLegacyNpm(legacyRoot, args) {
    const result = process.platform === "win32"
        ? (() => {
            const nodeDir = node_path_1.default.dirname(process.execPath);
            const candidatePaths = [
                node_path_1.default.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
                node_path_1.default.join(nodeDir, "..", "node_modules", "npm", "bin", "npm-cli.js")
            ];
            const npmCliPath = candidatePaths.find((candidate) => node_fs_1.default.existsSync(candidate));
            if (!npmCliPath) {
                throw new Error("Unable to locate npm-cli.js for Windows execution.");
            }
            return (0, node_child_process_1.spawnSync)(process.execPath, [npmCliPath, ...args], {
                cwd: legacyRoot,
                stdio: "inherit",
                shell: false
            });
        })()
        : (0, node_child_process_1.spawnSync)("npm", args, {
            cwd: legacyRoot,
            stdio: "inherit",
            shell: false
        });
    if (result.error) {
        throw result.error;
    }
    if ((result.status ?? 0) !== 0) {
        throw new Error(`Legacy workflow command failed with exit code ${result.status ?? 1}: npm ${args.join(" ")}`);
    }
}
function findLatestLegacyGeneratedFile(legacyRoot, storyId, extension) {
    const generatedRoot = node_path_1.default.join(legacyRoot, "generated-testcases");
    const prefix = `testcases_${storyId}_`;
    const files = node_fs_1.default
        .readdirSync(generatedRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => ({
        name: entry.name,
        fullPath: node_path_1.default.join(generatedRoot, entry.name),
        mtimeMs: node_fs_1.default.statSync(node_path_1.default.join(generatedRoot, entry.name)).mtimeMs
    }))
        .filter((entry) => entry.name.toLowerCase().startsWith(prefix.toLowerCase()) && entry.name.toLowerCase().endsWith(extension) && !entry.name.startsWith("~$"))
        .sort((left, right) => right.mtimeMs - left.mtimeMs);
    if (files.length === 0) {
        throw new Error(`No legacy generated ${extension} file was found for story ${storyId}.`);
    }
    return files[0].fullPath;
}
function sanitizeFileStem(value) {
    return String(value || "")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function readLegacyGeneratedPayload(jsonPath) {
    return (0, fs_1.readJson)(jsonPath);
}
function syncLegacyTemplate(context) {
    const templatePath = context.input.templatePath || node_path_1.default.join(context.projectRoot, "knowledge", "Referenced Template VSTS.xlsx");
    if (!node_fs_1.default.existsSync(templatePath)) {
        return null;
    }
    const legacyTemplatePath = node_path_1.default.join(getLegacyProjectRoot(context.projectRoot), "docs", "Template VSTS (1).xlsx");
    const currentTemplateBuffer = node_fs_1.default.readFileSync(templatePath);
    const existingBuffer = node_fs_1.default.existsSync(legacyTemplatePath) ? node_fs_1.default.readFileSync(legacyTemplatePath) : null;
    if (existingBuffer && Buffer.compare(existingBuffer, currentTemplateBuffer) === 0) {
        return null;
    }
    node_fs_1.default.writeFileSync(legacyTemplatePath, currentTemplateBuffer);
    return () => {
        if (existingBuffer) {
            node_fs_1.default.writeFileSync(legacyTemplatePath, existingBuffer);
        }
    };
}
async function runLegacyWorkbookGeneration(context) {
    const legacyRoot = getLegacyProjectRoot(context.projectRoot);
    const restoreTemplate = syncLegacyTemplate(context);
    try {
        if (context.input.navigationPath?.trim()) {
            runLegacyNpm(legacyRoot, [
                "run",
                "auto:testcases:playwright",
                "--",
                String(context.input.workItemId),
                `--suite-id=${context.input.suiteId}`,
                `--test-plan-id=${context.input.testPlanId}`,
                `--project=${context.input.project || "Cadency"}`,
                `--navigation=${context.input.navigationPath.trim()}`
            ]);
        }
        else {
            runLegacyNpm(legacyRoot, [
                "run",
                "auto:testcases",
                "--",
                String(context.input.workItemId),
                "--auto"
            ]);
        }
    }
    finally {
        restoreTemplate?.();
    }
    const legacyWorkbookPath = findLatestLegacyGeneratedFile(legacyRoot, context.input.workItemId, ".xlsx");
    const legacyJsonPath = findLatestLegacyGeneratedFile(legacyRoot, context.input.workItemId, ".json");
    const payload = readLegacyGeneratedPayload(legacyJsonPath);
    const storyTitle = sanitizeFileStem(payload.story?.title || String(context.input.workItemId)) || String(context.input.workItemId);
    const legacyWorkbookBaseName = node_path_1.default.basename(legacyWorkbookPath, ".xlsx");
    const timestampMatch = legacyWorkbookBaseName.match(/_(\d{10,})$/);
    const timestampSuffix = timestampMatch?.[1] || String(Date.now());
    const stagedFileName = storyTitle === String(context.input.workItemId)
        ? `${storyTitle} ${timestampSuffix}.xlsx`
        : `${context.input.workItemId} ${storyTitle} ${timestampSuffix}.xlsx`;
    const stagedWorkbookPath = node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel", stagedFileName);
    node_fs_1.default.copyFileSync(legacyWorkbookPath, stagedWorkbookPath);
    return {
        legacyWorkbookPath,
        stagedWorkbookPath,
        legacyJsonPath,
        storyTitle,
        totalTestCases: Number(payload.totalTestCases || 0),
        generatedAt: payload.generatedAt || new Date().toISOString()
    };
}
function writeStoryArtifactsFromLegacyPayload(context, generation) {
    const payload = readLegacyGeneratedPayload(generation.legacyJsonPath);
    const story = payload.story || {};
    (0, fs_1.writeJson)(node_path_1.default.join(context.storyArtifactsRoot, "story-summary.json"), {
        workItemId: context.input.workItemId,
        title: story.title || generation.storyTitle,
        description: story.description || "",
        acceptanceCriteria: story.acceptanceCriteria || "",
        reproSteps: story.reproSteps || "",
        comments: Array.isArray(story.comments) ? story.comments : [],
        attachmentsText: Array.isArray(story.attachmentsText) ? story.attachmentsText : [],
        state: story.state || "",
        priority: story.priority || "",
        storyPoints: story.storyPoints || 0,
        assignedTo: story.assignedTo || "",
        iteration: story.iteration || "",
        area: story.area || "",
        component: story.component || "",
        productRelease: story.productRelease || "",
        tags: Array.isArray(story.tags) ? story.tags : [],
        project: context.input.project || "Cadency",
        domain: (0, fs_1.readJson)(node_path_1.default.join(context.storyArtifactsRoot, "story-summary.json")).domain || "unknown",
        status: "ready-for-workbook-generation",
        source: "legacy-generator-bridge"
    });
}
async function runLegacyWorkbookUpload(context, approvedWorkbookPath) {
    const legacyRoot = getLegacyProjectRoot(context.projectRoot);
    const legacyGeneratedRoot = node_path_1.default.join(legacyRoot, "generated-testcases");
    const stagedUploadWorkbookPath = node_path_1.default.join(legacyGeneratedRoot, `testcases_${context.input.workItemId}_zzzz_stlcflow_reviewed.xlsx`);
    node_fs_1.default.copyFileSync(approvedWorkbookPath, stagedUploadWorkbookPath);
    runLegacyNpm(legacyRoot, [
        "run",
        "upload:testcases",
        "--",
        String(context.input.workItemId),
        String(context.input.suiteId),
        `--test-plan-id=${context.input.testPlanId}`
    ]);
    const parsedWorkbook = (0, workbook_parser_1.parseApprovedWorkbook)(approvedWorkbookPath);
    const expectedTitles = parsedWorkbook.testCases.map((testCase) => normalizeTitleForLookup(testCase.sourceTitle));
    let titleMap = new Map();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
        const suiteCases = await (0, ado_client_1.fetchSuiteCases)(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
        titleMap = new Map(suiteCases.map((suiteCase) => [normalizeTitleForLookup(suiteCase.title), suiteCase.id]));
        const matchedCount = expectedTitles.filter((title) => titleMap.has(title)).length;
        if (matchedCount === expectedTitles.length) {
            break;
        }
        if (attempt < 5) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
    const createdCaseMap = parsedWorkbook.testCases.map((testCase) => ({
        ordinal: testCase.caseOrdinal,
        title: testCase.sourceTitle,
        testCaseId: titleMap.get(normalizeTitleForLookup(testCase.sourceTitle)) || 0
    }));
    return {
        stagedUploadWorkbookPath,
        createdCaseMap
    };
}
