"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const stage_catalog_1 = require("./stage-catalog");
const run_stages_1 = require("./run-stages");
async function runPipeline(context) {
    return (0, run_stages_1.runSelectedStages)(context, stage_catalog_1.fullPlaywrightWorkflowStages);
}
