"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const context_1 = require("./orchestrator/context");
const automation_generation_1 = require("./orchestrator/automation-generation");
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
    const approvedWorkbookPath = readFlag(argv, "--approved-workbook");
    const project = readFlag(argv, "--project") || "Cadency";
    const navigationPath = readFlag(argv, "--navigation-path");
    if (!Number.isFinite(storyId) || !Number.isFinite(suiteId) || !Number.isFinite(testPlanId)) {
        throw new Error("Usage: npm run automation:generate-story -- --story-id=<id> --suite-id=<id> --test-plan-id=<id> [--approved-workbook=<path>] [--project=Cadency] [--navigation-path=\"Tasks > Scheduler\"]");
    }
    const context = (0, context_1.createFlowContext)(process.cwd(), {
        workItemId: storyId,
        suiteId,
        testPlanId,
        project,
        navigationPath: navigationPath || "",
        approvedWorkbookPath: approvedWorkbookPath ? node_path_1.default.resolve(process.cwd(), approvedWorkbookPath) : "",
        reviewApproved: true
    });
    const result = await (0, automation_generation_1.generateAutomationArtifacts)(context);
    console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
