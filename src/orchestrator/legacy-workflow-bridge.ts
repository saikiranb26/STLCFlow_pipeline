import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fetchSuiteCases } from "../../tests/utils/ado-client";
import { normalizeWorkbookTitleForLookup, parseApprovedWorkbook } from "../../tests/utils/workbook-parser";
import { readJson, writeJson } from "../utils/fs";
import type { FlowContext } from "./types";
import { getGeneratedExcelRoot } from "./workbook-conventions";

interface LegacyGeneratedPayload {
  story?: {
    id?: number;
    title?: string;
    description?: string;
    acceptanceCriteria?: string;
    reproSteps?: string;
    state?: string;
    priority?: string;
    storyPoints?: number;
    assignedTo?: string;
    iteration?: string;
    area?: string;
    component?: string;
    productRelease?: string;
    tags?: string[];
    comments?: string[];
    attachmentsText?: string[];
  };
  generatedAt?: string;
  totalTestCases?: number;
}

interface LegacyGenerationResult {
  legacyWorkbookPath: string;
  stagedWorkbookPath: string;
  legacyJsonPath: string;
  storyTitle: string;
  totalTestCases: number;
  generatedAt: string;
}

interface LegacyUploadResult {
  stagedUploadWorkbookPath: string;
  createdCaseMap: Array<{ ordinal: number; testCaseId: number; title: string }>;
  uploadMode: "reuse-existing-suite-cases" | "legacy-create";
  createdCaseCount: number;
  reusedCaseCount: number;
  skippedLegacyUploadReason?: string;
  existingSuiteCaseCount?: number;
  duplicateExistingTitleCount?: number;
  duplicateExistingTitles?: string[];
}

function normalizeTitleForLookup(value: string): string {
  return normalizeWorkbookTitleForLookup(value);
}

function shouldForceAdoUpload(): boolean {
  const value = String(process.env.STLCFLOW_FORCE_ADO_UPLOAD || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function buildSuiteTitleLookup(suiteCases: Array<{ id: number; title: string }>): {
  titleMap: Map<string, number>;
  duplicateTitleCount: number;
  duplicateTitles: string[];
} {
  const titleMap = new Map<string, number>();
  const groupedTitles = new Map<string, { displayTitle: string; ids: number[] }>();

  for (const suiteCase of suiteCases) {
    const normalizedTitle = normalizeTitleForLookup(suiteCase.title);
    if (!normalizedTitle) {
      continue;
    }

    const grouped = groupedTitles.get(normalizedTitle) || { displayTitle: suiteCase.title, ids: [] };
    grouped.ids.push(suiteCase.id);
    groupedTitles.set(normalizedTitle, grouped);

    const existingId = titleMap.get(normalizedTitle) || 0;
    if (suiteCase.id > existingId) {
      titleMap.set(normalizedTitle, suiteCase.id);
    }
  }

  const duplicateTitles = Array.from(groupedTitles.values())
    .filter((item) => item.ids.length > 1)
    .map((item) => `${item.displayTitle} (${item.ids.join(", ")})`);

  return {
    titleMap,
    duplicateTitleCount: duplicateTitles.length,
    duplicateTitles
  };
}

function buildWorkbookCaseMap(
  testCases: Array<{ caseOrdinal: number; sourceTitle: string }>,
  titleMap: Map<string, number>
): Array<{ ordinal: number; testCaseId: number; title: string }> {
  return testCases.map((testCase) => ({
    ordinal: testCase.caseOrdinal,
    title: testCase.sourceTitle,
    testCaseId: titleMap.get(normalizeTitleForLookup(testCase.sourceTitle)) || 0
  }));
}

function getLegacyProjectRoot(projectRoot: string): string {
  const configuredRoot = process.env.STLCFLOW_LEGACY_PROJECT_ROOT;
  const candidates = [
    configuredRoot,
    path.resolve(projectRoot, "..", "AdoMCPtestcasesUpload"),
    path.resolve(projectRoot, "..", "..", "AdoMCPtestcasesUpload")
  ].filter((value): value is string => Boolean(value));

  const legacyRoot = candidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
  if (!legacyRoot) {
    throw new Error(
      `Unable to locate AdoMCPtestcasesUpload. Checked: ${candidates.join(", ")}. Set STLCFLOW_LEGACY_PROJECT_ROOT to override.`
    );
  }

  return legacyRoot;
}

function runLegacyNpm(legacyRoot: string, args: string[]): void {
  const result =
    process.platform === "win32"
      ? (() => {
          const nodeDir = path.dirname(process.execPath);
          const candidatePaths = [
            path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
            path.join(nodeDir, "..", "node_modules", "npm", "bin", "npm-cli.js")
          ];
          const npmCliPath = candidatePaths.find((candidate) => fs.existsSync(candidate));
          if (!npmCliPath) {
            throw new Error("Unable to locate npm-cli.js for Windows execution.");
          }

          return spawnSync(process.execPath, [npmCliPath, ...args], {
            cwd: legacyRoot,
            stdio: "inherit",
            shell: false
          });
        })()
      : spawnSync("npm", args, {
          cwd: legacyRoot,
          stdio: "inherit",
          shell: false
        });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    throw new Error(`Legacy workflow command failed with exit code ${result.status ?? 1}: npm ${args.join(" ")}`);
  }
}

function findLatestLegacyGeneratedFile(legacyRoot: string, storyId: number, extension: ".xlsx" | ".json"): string {
  const generatedRoot = path.join(legacyRoot, "generated-testcases");
  const prefix = `testcases_${storyId}_`;
  const files = fs
    .readdirSync(generatedRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(generatedRoot, entry.name),
      mtimeMs: fs.statSync(path.join(generatedRoot, entry.name)).mtimeMs
    }))
    .filter((entry) => entry.name.toLowerCase().startsWith(prefix.toLowerCase()) && entry.name.toLowerCase().endsWith(extension) && !entry.name.startsWith("~$"))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (files.length === 0) {
    throw new Error(`No legacy generated ${extension} file was found for story ${storyId}.`);
  }

  return files[0].fullPath;
}

function sanitizeFileStem(value: string): string {
  return String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readLegacyGeneratedPayload(jsonPath: string): LegacyGeneratedPayload {
  return readJson<LegacyGeneratedPayload>(jsonPath);
}

function syncLegacyTemplate(context: FlowContext): (() => void) | null {
  const templatePath = context.input.templatePath || path.join(context.projectRoot, "knowledge", "Referenced Template VSTS.xlsx");
  if (!fs.existsSync(templatePath)) {
    return null;
  }

  const legacyTemplatePath = path.join(getLegacyProjectRoot(context.projectRoot), "docs", "Template VSTS (1).xlsx");
  const currentTemplateBuffer = fs.readFileSync(templatePath);
  const existingBuffer = fs.existsSync(legacyTemplatePath) ? fs.readFileSync(legacyTemplatePath) : null;

  if (existingBuffer && Buffer.compare(existingBuffer, currentTemplateBuffer) === 0) {
    return null;
  }

  fs.writeFileSync(legacyTemplatePath, currentTemplateBuffer);
  return () => {
    if (existingBuffer) {
      fs.writeFileSync(legacyTemplatePath, existingBuffer);
    }
  };
}

export async function runLegacyWorkbookGeneration(context: FlowContext): Promise<LegacyGenerationResult> {
  const legacyRoot = getLegacyProjectRoot(context.projectRoot);
  const restoreTemplate = syncLegacyTemplate(context);

  try {
    if (context.input.navigationPath?.trim()) {
      runLegacyNpm(legacyRoot, [
        "run",
        "auto:testcases:playwright",
        "--",
        String(context.input.workItemId),
        `--suite-id=${context.input.suiteId}`,
        `--test-plan-id=${context.input.testPlanId}`,
        `--project=${context.input.project || "Cadency"}`,
        `--navigation=${context.input.navigationPath.trim()}`
      ]);
    } else {
      runLegacyNpm(legacyRoot, [
        "run",
        "auto:testcases",
        "--",
        String(context.input.workItemId),
        "--auto"
      ]);
    }
  } finally {
    restoreTemplate?.();
  }

  const legacyWorkbookPath = findLatestLegacyGeneratedFile(legacyRoot, context.input.workItemId, ".xlsx");
  const legacyJsonPath = findLatestLegacyGeneratedFile(legacyRoot, context.input.workItemId, ".json");
  const payload = readLegacyGeneratedPayload(legacyJsonPath);
  const storyTitle = sanitizeFileStem(payload.story?.title || String(context.input.workItemId)) || String(context.input.workItemId);
  const legacyWorkbookBaseName = path.basename(legacyWorkbookPath, ".xlsx");
  const timestampMatch = legacyWorkbookBaseName.match(/_(\d{10,})$/);
  const timestampSuffix = timestampMatch?.[1] || String(Date.now());
  const stagedFileName =
    storyTitle === String(context.input.workItemId)
      ? `${storyTitle} ${timestampSuffix}.xlsx`
      : `${context.input.workItemId} ${storyTitle} ${timestampSuffix}.xlsx`;
  const stagedWorkbookPath = path.join(getGeneratedExcelRoot(context.projectRoot, context.input), stagedFileName);

  fs.copyFileSync(legacyWorkbookPath, stagedWorkbookPath);

  return {
    legacyWorkbookPath,
    stagedWorkbookPath,
    legacyJsonPath,
    storyTitle,
    totalTestCases: Number(payload.totalTestCases || 0),
    generatedAt: payload.generatedAt || new Date().toISOString()
  };
}

export function writeStoryArtifactsFromLegacyPayload(context: FlowContext, generation: LegacyGenerationResult): void {
  const payload = readLegacyGeneratedPayload(generation.legacyJsonPath);
  const story = payload.story || {};

  writeJson(path.join(context.storyArtifactsRoot, "story-summary.json"), {
    workItemId: context.input.workItemId,
    title: story.title || generation.storyTitle,
    description: story.description || "",
    acceptanceCriteria: story.acceptanceCriteria || "",
    reproSteps: story.reproSteps || "",
    comments: Array.isArray(story.comments) ? story.comments : [],
    attachmentsText: Array.isArray(story.attachmentsText) ? story.attachmentsText : [],
    state: story.state || "",
    priority: story.priority || "",
    storyPoints: story.storyPoints || 0,
    assignedTo: story.assignedTo || "",
    iteration: story.iteration || "",
    area: story.area || "",
    component: story.component || "",
    productRelease: story.productRelease || "",
    tags: Array.isArray(story.tags) ? story.tags : [],
    project: context.input.project || "Cadency",
    domain: readJson<{ domain?: string }>(path.join(context.storyArtifactsRoot, "story-summary.json")).domain || "unknown",
    status: "ready-for-workbook-generation",
    source: "legacy-generator-bridge"
  });
}

export async function runLegacyWorkbookUpload(context: FlowContext, approvedWorkbookPath: string): Promise<LegacyUploadResult> {
  const legacyRoot = getLegacyProjectRoot(context.projectRoot);
  const legacyGeneratedRoot = path.join(legacyRoot, "generated-testcases");
  const stagedUploadWorkbookPath = path.join(
    legacyGeneratedRoot,
    `testcases_${context.input.workItemId}_zzzz_stlcflow_reviewed.xlsx`
  );
  fs.mkdirSync(legacyGeneratedRoot, { recursive: true });
  fs.copyFileSync(approvedWorkbookPath, stagedUploadWorkbookPath);

  const parsedWorkbook = parseApprovedWorkbook(approvedWorkbookPath);
  const forceUpload = shouldForceAdoUpload();
  if (!forceUpload) {
    const suiteCases = await fetchSuiteCases(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
    const suiteLookup = buildSuiteTitleLookup(suiteCases);
    const existingCaseMap = buildWorkbookCaseMap(parsedWorkbook.testCases, suiteLookup.titleMap);
    const matchedCases = existingCaseMap.filter((testCase) => testCase.testCaseId > 0);

    if (matchedCases.length === parsedWorkbook.testCases.length && parsedWorkbook.testCases.length > 0) {
      return {
        stagedUploadWorkbookPath,
        createdCaseMap: existingCaseMap,
        uploadMode: "reuse-existing-suite-cases",
        createdCaseCount: 0,
        reusedCaseCount: matchedCases.length,
        skippedLegacyUploadReason:
          "All reviewed workbook testcase titles already exist in the target suite, so the legacy uploader was skipped to avoid duplicate ADO testcases.",
        existingSuiteCaseCount: suiteCases.length,
        duplicateExistingTitleCount: suiteLookup.duplicateTitleCount,
        duplicateExistingTitles: suiteLookup.duplicateTitles
      };
    }

    if (matchedCases.length > 0) {
      const missingTitles = existingCaseMap
        .filter((testCase) => testCase.testCaseId <= 0)
        .map((testCase) => testCase.title);
      throw new Error(
        [
          `Upload blocked to avoid duplicate ADO testcases: ${matchedCases.length}/${parsedWorkbook.testCases.length} reviewed workbook titles already exist in suite ${context.input.suiteId}.`,
          `Missing titles: ${missingTitles.slice(0, 10).join("; ")}${missingTitles.length > 10 ? "; ..." : ""}`,
          "The legacy uploader can only create the whole workbook, not only missing rows.",
          "Set STLCFLOW_FORCE_ADO_UPLOAD=1 only when you intentionally want a fresh duplicate testcase set."
        ].join(" ")
      );
    }
  }

  runLegacyNpm(legacyRoot, [
    "run",
    "upload:testcases",
    "--",
    String(context.input.workItemId),
    String(context.input.suiteId),
    `--test-plan-id=${context.input.testPlanId}`
  ]);

  const expectedTitles = parsedWorkbook.testCases.map((testCase) => normalizeTitleForLookup(testCase.sourceTitle));
  let titleMap = new Map<string, number>();
  let duplicateExistingTitleCount = 0;
  let duplicateExistingTitles: string[] = [];
  let existingSuiteCaseCount = 0;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const suiteCases = await fetchSuiteCases(context.input.project || "Cadency", context.input.testPlanId, context.input.suiteId);
    const suiteLookup = buildSuiteTitleLookup(suiteCases);
    titleMap = suiteLookup.titleMap;
    duplicateExistingTitleCount = suiteLookup.duplicateTitleCount;
    duplicateExistingTitles = suiteLookup.duplicateTitles;
    existingSuiteCaseCount = suiteCases.length;
    const matchedCount = expectedTitles.filter((title) => titleMap.has(title)).length;
    if (matchedCount === expectedTitles.length) {
      break;
    }

    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const createdCaseMap = buildWorkbookCaseMap(parsedWorkbook.testCases, titleMap);

  return {
    stagedUploadWorkbookPath,
    createdCaseMap,
    uploadMode: "legacy-create",
    createdCaseCount: createdCaseMap.filter((testCase) => testCase.testCaseId > 0).length,
    reusedCaseCount: 0,
    existingSuiteCaseCount,
    duplicateExistingTitleCount,
    duplicateExistingTitles
  };
}
