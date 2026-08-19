"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const context_1 = require("./orchestrator/context");
const pipeline_1 = require("./orchestrator/pipeline");
function readArgValue(flag, argv) {
    const index = argv.findIndex((arg) => arg === flag);
    if (index === -1 || index === argv.length - 1) {
        return undefined;
    }
    return argv[index + 1];
}
function printUsage() {
    console.log("Usage:");
    console.log("  npm run dev -- --input config/story-run.example.json");
    console.log("");
    console.log("Flags:");
    console.log("  --input <path>   Path to the story run input JSON");
}
async function main() {
    const argv = process.argv.slice(2);
    if (argv.includes("--help") || argv.includes("-h")) {
        printUsage();
        return;
    }
    const inputArg = readArgValue("--input", argv);
    if (!inputArg) {
        printUsage();
        process.exitCode = 1;
        return;
    }
    const projectRoot = process.cwd();
    const inputPath = node_path_1.default.resolve(projectRoot, inputArg);
    const storyRunInput = (0, context_1.loadStoryRunInput)(inputPath);
    const context = (0, context_1.createFlowContext)(projectRoot, storyRunInput);
    const summary = await (0, pipeline_1.runPipeline)(context);
    console.log("");
    console.log("Pipeline finished.");
    console.log(`Story: ${summary.input.workItemId}`);
    console.log(`Status: ${summary.overallStatus}`);
    console.log(`State file: ${summary.stateFilePath}`);
    if (summary.blockedStage) {
        const agentLabel = summary.blockedStage.agentKey ? ` [${summary.blockedStage.agentKey}]` : "";
        console.log(`Blocked at: ${summary.blockedStage.key}${agentLabel}`);
        if (summary.blockedStage.nextAction) {
            console.log(`Next action: ${summary.blockedStage.nextAction}`);
        }
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
