"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStateFilePath = getStateFilePath;
exports.runSelectedStages = runSelectedStages;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../utils/fs");
function getStateFilePath(context) {
    return node_path_1.default.join(context.storyArtifactsRoot, "run-state.json");
}
function persistState(context, stageResults) {
    (0, fs_1.writeJson)(getStateFilePath(context), {
        story: context.input,
        startedAt: context.startedAt,
        updatedAt: new Date().toISOString(),
        stageResults
    });
}
async function runSelectedStages(context, stages, existingResults = []) {
    const stageResults = [...existingResults];
    for (const stage of stages) {
        const result = await stage(context);
        stageResults.push(result);
        persistState(context, stageResults);
        if (result.status === "blocked") {
            return {
                input: context.input,
                overallStatus: "blocked",
                stages: stageResults,
                blockedStage: result,
                stateFilePath: getStateFilePath(context)
            };
        }
    }
    return {
        input: context.input,
        overallStatus: "completed",
        stages: stageResults,
        stateFilePath: getStateFilePath(context)
    };
}
