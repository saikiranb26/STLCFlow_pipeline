import path from "node:path";
import { writeJson } from "../../utils/fs";
import type { FlowContext, StageResult } from "../types";
import { getExpectedWorkbookPath, resolveApprovedWorkbookPath } from "../workbook-conventions";

export async function reviewGateStage(context: FlowContext): Promise<StageResult> {
  const artifactPath = path.join(context.storyArtifactsRoot, "review-gate.json");
  const draftWorkbookPath = getExpectedWorkbookPath(context.projectRoot, context.input);
  const resolvedWorkbook = resolveApprovedWorkbookPath(context.projectRoot, context.input);
  writeJson(artifactPath, {
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
      nextAction: `Review the draft workbook, save the approved version under ${path.join(context.projectRoot, "artifacts", "generated-excel")}, and rerun with reviewApproved=true.`
    };
  }

  if (!resolvedWorkbook) {
    return {
      key: "reviewGate",
      status: "blocked",
      summary: "Review approval is present, but the approved workbook could not be resolved.",
      artifactPaths: [artifactPath],
      nextAction: `Save the approved workbook under ${path.join(context.projectRoot, "artifacts", "generated-excel")} using the story name or work item ID, or provide approvedWorkbookPath explicitly.`
    };
  }

  return {
    key: "reviewGate",
    status: "completed",
    summary: "Review approval is present and the approved workbook was resolved successfully, so the pipeline can continue past the workbook gate.",
    artifactPaths: [artifactPath]
  };
}
