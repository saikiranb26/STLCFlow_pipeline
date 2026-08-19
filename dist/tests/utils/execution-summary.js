"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExecutionSummaryFile = buildExecutionSummaryFile;
exports.writeExecutionSummary = writeExecutionSummary;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function ensureDir(dirPath) {
    node_fs_1.default.mkdirSync(dirPath, { recursive: true });
}
function buildExecutionSummaryFile(input) {
    return {
        generatedAt: new Date().toISOString(),
        workItemId: input.workItemId,
        suiteId: input.suiteId,
        testPlanId: input.testPlanId,
        runId: input.runId,
        runCompletionWarning: input.runCompletionWarning,
        results: input.results,
        failures: input.results.filter((item) => item.outcome !== "Passed")
    };
}
function writeExecutionSummary(filePath, summary) {
    ensureDir(node_path_1.default.dirname(filePath));
    node_fs_1.default.writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
