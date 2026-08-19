import path from "node:path";
import { writeJson } from "../../utils/fs";
import { getKnowledgeArtifactPaths } from "../knowledge";
import { resolveReferenceRoots, resolveTemplate } from "../references";
import type { FlowContext, StageResult } from "../types";

export async function loadReferencesStage(context: FlowContext): Promise<StageResult> {
  const intakeArtifactPath = path.join(context.storyArtifactsRoot, "reference-intake.json");
  const extractionPlanArtifactPath = path.join(
    context.storyArtifactsRoot,
    "reference-extraction-plan.json"
  );
  const template = resolveTemplate(context.projectRoot, context.input);
  const referenceRoots = resolveReferenceRoots(context.input);
  const uniquePlanIds = [...new Set(referenceRoots.map((root) => root.planId))];
  const knowledgeArtifacts = getKnowledgeArtifactPaths(context.knowledgeRoot);

  writeJson(intakeArtifactPath, {
    project: context.input.project || "Cadency",
    template,
    referenceRoots,
    extractionMode: "ado-direct-recursive",
    sourceOfTruth: "Azure DevOps MCP",
    knowledgeRule:
      "Reference suites are pattern and coverage sources only. Newly generated story testcases must be freshly written and must not copy-paste old testcase content.",
    existingKnowledgeArtifacts: [
      path.join(context.knowledgeRoot, "match-application-reference-analysis.md"),
      path.join(context.knowledgeRoot, "ado-direct-coverage-status.md"),
      path.join(context.knowledgeRoot, "latest-release-recurring-patterns.md"),
      knowledgeArtifacts.referenceRootsPath,
      knowledgeArtifacts.referenceSuiteCorpusPath,
      knowledgeArtifacts.referenceHarvestStatusPath,
      knowledgeArtifacts.matchHelpReadmePath,
      knowledgeArtifacts.matchHelpPageIndexPath
    ]
  });

  if (!template.exists) {
    writeJson(extractionPlanArtifactPath, {
      status: "blocked",
      reason: "Referenced Excel template file was not found.",
      resolvedTemplatePath: template.path,
      requiredInputs: ["templatePath"]
    });

    return {
      key: "loadReferences",
      status: "blocked",
      summary: "Reference intake is blocked because the referenced Excel template file does not exist.",
      artifactPaths: [intakeArtifactPath, extractionPlanArtifactPath],
      nextAction: `Place the template at ${template.path} or update templatePath in the story run input.`
    };
  }

  writeJson(extractionPlanArtifactPath, {
    status: "ready",
    project: context.input.project || "Cadency",
    roots: referenceRoots,
    uniquePlanIds,
    traversal: {
      recursive: true,
      includeParentSuites: true,
      includeChildSuites: true,
      includeLeafSuites: true,
      includeManualSteps: true,
      includeTitles: true,
      includeExpectedResults: true
    },
    plannedArtifacts: [
      "reference-suite-tree.json",
      "reference-testcase-corpus.json",
      "reference-pattern-summary.json"
    ],
    extractionRules: [
      "Treat every provided plan or suite as a root node.",
      "Traverse all descendant child suites instead of stopping at the parent level.",
      "Prefer direct ADO / Visual Studio data over local cache artifacts.",
      "Use harvested testcases for style, coverage, and domain behavior only."
    ]
  });

  return {
    key: "loadReferences",
    status: "completed",
    summary: `Prepared the recursive ADO reference extraction plan using ${referenceRoots.length} root sources across ${uniquePlanIds.length} plan(s).`,
    artifactPaths: [intakeArtifactPath, extractionPlanArtifactPath]
  };
}
