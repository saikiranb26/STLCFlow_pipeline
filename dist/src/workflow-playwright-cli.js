"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:readline/promises");
const context_1 = require("./orchestrator/context");
const stage_catalog_1 = require("./orchestrator/stage-catalog");
const run_stages_1 = require("./orchestrator/run-stages");
const workbook_conventions_1 = require("./orchestrator/workbook-conventions");
const fs_1 = require("./utils/fs");
function readFlag(argv, name) {
    const direct = argv.find((item) => item.startsWith(`${name}=`));
    if (direct) {
        return direct.slice(name.length + 1);
    }
    const index = argv.findIndex((item) => item === name);
    if (index >= 0 && index < argv.length - 1) {
        return argv[index + 1];
    }
    return undefined;
}
function hasFlag(argv, name) {
    return argv.includes(name);
}
function parseBooleanFlag(value) {
    if (!value) {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
}
function parseArgs(argv) {
    const storyId = Number(readFlag(argv, "--story-id"));
    const suiteId = Number(readFlag(argv, "--suite-id"));
    const testPlanId = Number(readFlag(argv, "--test-plan-id"));
    const testCaseIdRaw = readFlag(argv, "--test-case-id");
    const testCaseId = testCaseIdRaw ? Number(testCaseIdRaw) : undefined;
    if (!Number.isFinite(storyId) ||
        !Number.isFinite(suiteId) ||
        !Number.isFinite(testPlanId) ||
        (testCaseIdRaw && !Number.isFinite(testCaseId))) {
        throw new Error("Usage: npm run workflow:playwright -- --story-id=<id> --suite-id=<id> --test-plan-id=<id> [--test-case-id=<id>] [--project=Cadency] [--navigation-path=\"...\"] [--approved-workbook=<path>] [--review-approved=true] [--generate-only] [--upload-only] [--execute-only] [--skip-execution] [--headless]");
    }
    const generateOnly = hasFlag(argv, "--generate-only");
    const uploadOnly = hasFlag(argv, "--upload-only");
    const executeOnly = hasFlag(argv, "--execute-only");
    const modeCount = [generateOnly, uploadOnly, executeOnly].filter(Boolean).length;
    if (modeCount > 1) {
        throw new Error("Use only one of --generate-only, --upload-only, or --execute-only.");
    }
    return {
        storyId,
        suiteId,
        testPlanId,
        testCaseId,
        project: readFlag(argv, "--project") || "Cadency",
        navigationPath: readFlag(argv, "--navigation-path") || "",
        approvedWorkbookPath: readFlag(argv, "--approved-workbook") || "",
        outputRoot: readFlag(argv, "--output-root") || "",
        reviewApproved: parseBooleanFlag(readFlag(argv, "--review-approved")) || hasFlag(argv, "--review-approved"),
        generateOnly,
        uploadOnly,
        executeOnly,
        skipExecution: hasFlag(argv, "--skip-execution"),
        headless: hasFlag(argv, "--headless")
    };
}
function pickStages(args) {
    if (args.generateOnly) {
        return stage_catalog_1.generateWorkflowStages;
    }
    if (args.uploadOnly) {
        return stage_catalog_1.uploadWorkflowStages;
    }
    if (args.executeOnly) {
        return stage_catalog_1.executeWorkflowStages;
    }
    if (args.skipExecution) {
        return stage_catalog_1.uploadWithoutExecutionStages;
    }
    return stage_catalog_1.fullPlaywrightWorkflowStages;
}
function getPostApprovalStages(args) {
    if (args.uploadOnly || args.skipExecution) {
        return stage_catalog_1.uploadWorkflowStages;
    }
    if (args.executeOnly) {
        return stage_catalog_1.executeWorkflowStages;
    }
    return [stage_catalog_1.uploadWorkflowStages[0], stage_catalog_1.uploadWorkflowStages[1], ...stage_catalog_1.executeWorkflowStages.slice(1)];
}
function buildInput(projectRoot, args) {
    return {
        workItemId: args.storyId,
        suiteId: args.suiteId,
        testPlanId: args.testPlanId,
        testCaseId: args.testCaseId,
        project: args.project,
        navigationPath: args.navigationPath,
        approvedWorkbookPath: args.approvedWorkbookPath
            ? node_path_1.default.resolve(projectRoot, args.approvedWorkbookPath)
            : "",
        outputRoot: args.outputRoot || "",
        reviewApproved: args.reviewApproved
    };
}
function describeMode(args) {
    if (args.generateOnly) {
        return "generate-only";
    }
    if (args.uploadOnly) {
        return "upload-only";
    }
    if (args.executeOnly) {
        return "execute-only";
    }
    if (args.skipExecution) {
        return "generate-review-upload";
    }
    return "full";
}
function printSummary(summary, args) {
    console.log("");
    console.log("STLCFlow Playwright workflow finished.");
    console.log(`Mode: ${describeMode(args)}`);
    console.log(`Story: ${summary.input.workItemId}`);
    console.log(`Suite: ${summary.input.suiteId}`);
    console.log(`Plan: ${summary.input.testPlanId}`);
    console.log(`Status: ${summary.overallStatus}`);
    console.log(`State file: ${summary.stateFilePath}`);
    for (const stage of summary.stages) {
        const agentLabel = stage.agentKey ? ` [${stage.agentKey}]` : "";
        console.log(`- ${stage.key}${agentLabel}: ${stage.status} | ${stage.summary}`);
    }
    if (summary.blockedStage?.nextAction) {
        console.log(`Next action: ${summary.blockedStage.nextAction}`);
    }
}
function getWorkbookGenerationPlanPath(projectRoot, storyId) {
    return node_path_1.default.join(projectRoot, "artifacts", "stories", String(storyId), "workbook-generation-plan.json");
}
function resolveDraftWorkbookPath(projectRoot, args) {
    const generationPlanPath = getWorkbookGenerationPlanPath(projectRoot, args.storyId);
    if (node_fs_1.default.existsSync(generationPlanPath)) {
        try {
            const plan = (0, fs_1.readJson)(generationPlanPath);
            const generatedWorkbookPath = String(plan.generatedWorkbookPath || "").trim();
            if (generatedWorkbookPath && node_fs_1.default.existsSync(generatedWorkbookPath)) {
                return generatedWorkbookPath;
            }
        }
        catch {
            // Ignore malformed artifact files and continue to fallbacks.
        }
    }
    const expectedWorkbookPath = (0, workbook_conventions_1.getExpectedWorkbookPath)(projectRoot, {
        workItemId: args.storyId,
        suiteId: args.suiteId,
        testPlanId: args.testPlanId
    });
    if (node_fs_1.default.existsSync(expectedWorkbookPath)) {
        return expectedWorkbookPath;
    }
    const generatedExcelRoot = node_path_1.default.join(projectRoot, "artifacts", "generated-excel");
    if (!node_fs_1.default.existsSync(generatedExcelRoot)) {
        return "";
    }
    const fuzzyMatches = node_fs_1.default
        .readdirSync(generatedExcelRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx") && !entry.name.startsWith("~$"))
        .map((entry) => ({
        name: entry.name,
        fullPath: node_path_1.default.join(generatedExcelRoot, entry.name),
        mtimeMs: node_fs_1.default.statSync(node_path_1.default.join(generatedExcelRoot, entry.name)).mtimeMs
    }))
        .filter((entry) => entry.name.includes(String(args.storyId)))
        .sort((left, right) => right.mtimeMs - left.mtimeMs);
    return fuzzyMatches[0]?.fullPath || "";
}
function openWorkbookForReview(workbookPath) {
    if (!workbookPath || !node_fs_1.default.existsSync(workbookPath) || process.platform !== "win32") {
        return;
    }
    (0, node_child_process_1.spawnSync)("cmd.exe", ["/d", "/s", "/c", "start", "", workbookPath], {
        stdio: "ignore",
        windowsHide: false
    });
}
function escapePowerShellLiteral(value) {
    return value.replace(/'/g, "''");
}
function requestApprovalViaGui(workbookPath) {
    if (process.platform !== "win32") {
        return null;
    }
    const promptText = [
        "Review the generated workbook, save any edits, then click Yes to continue.",
        "",
        workbookPath
    ].join("\n");
    const command = [
        "Add-Type -AssemblyName System.Windows.Forms",
        `$message = '${escapePowerShellLiteral(promptText).replace(/\n/g, "`n")}'`,
        "$result = [System.Windows.Forms.MessageBox]::Show($message, 'STLCFlow Review Approval', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)",
        "if ($result -eq [System.Windows.Forms.DialogResult]::Yes) { 'yes' } else { 'no' }"
    ].join("; ");
    const result = (0, node_child_process_1.spawnSync)("powershell.exe", ["-NoProfile", "-Command", command], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: false
    });
    if (result.status !== 0) {
        return null;
    }
    const decision = String(result.stdout || "").trim().toLowerCase();
    if (decision === "yes") {
        return true;
    }
    if (decision === "no") {
        return false;
    }
    return null;
}
async function requestApprovalViaConsole(workbookPath) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        return false;
    }
    const prompt = (0, promises_1.createInterface)({
        input: process.stdin,
        output: process.stdout
    });
    try {
        const answer = await prompt.question(`Review the workbook at:\n${workbookPath}\n\nApprove upload/execution and continue? (y/N): `);
        const normalized = answer.trim().toLowerCase();
        return normalized === "y" || normalized === "yes";
    }
    finally {
        prompt.close();
    }
}
async function requestReviewApproval(projectRoot, args) {
    const workbookPath = args.approvedWorkbookPath
        ? node_path_1.default.resolve(projectRoot, args.approvedWorkbookPath)
        : resolveDraftWorkbookPath(projectRoot, args);
    if (!workbookPath || !node_fs_1.default.existsSync(workbookPath)) {
        console.log("Could not resolve the generated workbook for manual review.");
        return {
            approved: false,
            workbookPath: ""
        };
    }
    openWorkbookForReview(workbookPath);
    const guiDecision = requestApprovalViaGui(workbookPath);
    if (guiDecision !== null) {
        return {
            approved: guiDecision,
            workbookPath
        };
    }
    const consoleDecision = await requestApprovalViaConsole(workbookPath);
    return {
        approved: consoleDecision,
        workbookPath
    };
}
function withApprovedWorkbook(args, workbookPath) {
    return {
        ...args,
        reviewApproved: true,
        approvedWorkbookPath: workbookPath
    };
}
async function main() {
    const argv = process.argv.slice(2);
    const args = parseArgs(argv);
    const projectRoot = process.cwd();
    if (!args.headless) {
        process.env.PW_HEADLESS = "0";
    }
    else {
        process.env.PW_HEADLESS = "1";
    }
    const directMode = args.generateOnly || args.reviewApproved;
    if (directMode) {
        const context = (0, context_1.createFlowContext)(projectRoot, buildInput(projectRoot, args));
        const stages = pickStages(args);
        const summary = await (0, run_stages_1.runSelectedStages)(context, stages);
        printSummary(summary, args);
        if (summary.overallStatus === "blocked") {
            process.exitCode = 2;
        }
        return;
    }
    if (args.uploadOnly || args.executeOnly) {
        const approval = await requestReviewApproval(projectRoot, args);
        if (!approval.approved) {
            console.log("Workflow cancelled because workbook approval was not granted.");
            return;
        }
        const approvedArgs = withApprovedWorkbook(args, approval.workbookPath);
        const context = (0, context_1.createFlowContext)(projectRoot, buildInput(projectRoot, approvedArgs));
        const summary = await (0, run_stages_1.runSelectedStages)(context, pickStages(approvedArgs));
        printSummary(summary, approvedArgs);
        if (summary.overallStatus === "blocked") {
            process.exitCode = 2;
        }
        return;
    }
    const generationContext = (0, context_1.createFlowContext)(projectRoot, buildInput(projectRoot, args));
    const generationSummary = await (0, run_stages_1.runSelectedStages)(generationContext, stage_catalog_1.generateWorkflowStages);
    if (generationSummary.overallStatus === "blocked") {
        printSummary(generationSummary, args);
        process.exitCode = 2;
        return;
    }
    const approval = await requestReviewApproval(projectRoot, args);
    if (!approval.approved) {
        printSummary(generationSummary, args);
        console.log("Workflow cancelled because workbook approval was not granted.");
        return;
    }
    const approvedArgs = withApprovedWorkbook(args, approval.workbookPath);
    const postApprovalContext = (0, context_1.createFlowContext)(projectRoot, buildInput(projectRoot, approvedArgs));
    const finalSummary = await (0, run_stages_1.runSelectedStages)(postApprovalContext, getPostApprovalStages(approvedArgs), generationSummary.stages);
    printSummary(finalSummary, approvedArgs);
    if (finalSummary.overallStatus === "blocked") {
        process.exitCode = 2;
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
