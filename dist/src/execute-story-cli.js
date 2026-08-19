"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const context_1 = require("./orchestrator/context");
const story_execution_1 = require("./orchestrator/story-execution");
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
async function main() {
    const argv = process.argv.slice(2);
    const storyId = Number(readFlag(argv, "--story-id"));
    const suiteId = Number(readFlag(argv, "--suite-id"));
    const testPlanId = Number(readFlag(argv, "--test-plan-id"));
    const testCaseIdRaw = readFlag(argv, "--test-case-id");
    const testCaseId = testCaseIdRaw ? Number(testCaseIdRaw) : undefined;
    const approvedWorkbookPath = readFlag(argv, "--approved-workbook");
    const project = readFlag(argv, "--project") || "Cadency";
    if (!Number.isFinite(storyId) ||
        !Number.isFinite(suiteId) ||
        !Number.isFinite(testPlanId) ||
        (testCaseIdRaw && !Number.isFinite(testCaseId))) {
        throw new Error("Usage: npm run automation:execute-story -- --story-id=<id> --suite-id=<id> --test-plan-id=<id> [--test-case-id=<id>] [--approved-workbook=<path>] [--project=Cadency]");
    }
    const context = (0, context_1.createFlowContext)(process.cwd(), {
        workItemId: storyId,
        suiteId,
        testPlanId,
        testCaseId,
        project,
        approvedWorkbookPath: approvedWorkbookPath ? node_path_1.default.resolve(process.cwd(), approvedWorkbookPath) : "",
        reviewApproved: true
    });
    const result = await (0, story_execution_1.executeGeneratedStory)(context);
    console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
