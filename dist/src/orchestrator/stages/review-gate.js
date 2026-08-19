"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewGateStage = reviewGateStage;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../../utils/fs");
const workbook_conventions_1 = require("../workbook-conventions");
async function reviewGateStage(context) {
    const artifactPath = node_path_1.default.join(context.storyArtifactsRoot, "review-gate.json");
    const draftWorkbookPath = (0, workbook_conventions_1.getExpectedWorkbookPath)(context.projectRoot, context.input);
    const resolvedWorkbook = (0, workbook_conventions_1.resolveApprovedWorkbookPath)(context.projectRoot, context.input);
    (0, fs_1.writeJson)(artifactPath, {
        reviewApproved: Boolean(context.input.reviewApproved),
        draftWorkbookPath,
        approvedWorkbookPath: resolvedWorkbook?.path || "",
        note: "Upload and automation generation must use the reviewed workbook only, resolved from artifacts/generated-excel unless explicitly overridden."
    });
    if (!context.input.reviewApproved) {
        return {
            key: "reviewGate",
            status: "blocked",
            summary: "Waiting for manual workbook review and approval before upload and automation generation.",
            artifactPaths: [artifactPath],
            nextAction: `Review the draft workbook, save the approved version under ${node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel")}, and rerun with reviewApproved=true.`
        };
    }
    if (!resolvedWorkbook) {
        return {
            key: "reviewGate",
            status: "blocked",
            summary: "Review approval is present, but the approved workbook could not be resolved.",
            artifactPaths: [artifactPath],
            nextAction: `Save the approved workbook under ${node_path_1.default.join(context.projectRoot, "artifacts", "generated-excel")} using the story name or work item ID, or provide approvedWorkbookPath explicitly.`
        };
    }
    return {
        key: "reviewGate",
        status: "completed",
        summary: "Review approval is present and the approved workbook was resolved successfully, so the pipeline can continue past the workbook gate.",
        artifactPaths: [artifactPath]
    };
}
