"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeneratedExcelRoot = getGeneratedExcelRoot;
exports.getExpectedWorkbookPath = getExpectedWorkbookPath;
exports.resolveApprovedWorkbookPath = resolveApprovedWorkbookPath;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../utils/fs");
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function toSafeFileStem(value) {
    return clean(value)
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function getStorySummaryTitle(projectRoot, workItemId) {
    const storySummaryPath = node_path_1.default.join(projectRoot, "artifacts", "stories", String(workItemId), "story-summary.json");
    if (!node_fs_1.default.existsSync(storySummaryPath)) {
        return undefined;
    }
    try {
        const storySummary = (0, fs_1.readJson)(storySummaryPath);
        return clean(storySummary.title || "");
    }
    catch {
        return undefined;
    }
}
function getCandidateBaseNames(projectRoot, input) {
    const storyTitle = getStorySummaryTitle(projectRoot, input.workItemId);
    return Array.from(new Set([
        storyTitle ? toSafeFileStem(storyTitle) : "",
        storyTitle ? toSafeFileStem(`${input.workItemId} ${storyTitle}`) : "",
        String(input.workItemId)
    ].filter(Boolean)));
}
function getGeneratedExcelRoot(projectRoot) {
    const generatedExcelRoot = node_path_1.default.join(projectRoot, "artifacts", "generated-excel");
    (0, fs_1.ensureDir)(generatedExcelRoot);
    return generatedExcelRoot;
}
function getExpectedWorkbookPath(projectRoot, input) {
    const generatedExcelRoot = getGeneratedExcelRoot(projectRoot);
    const title = getStorySummaryTitle(projectRoot, input.workItemId);
    const fileName = title ? `${toSafeFileStem(title)}.xlsx` : `${input.workItemId}.xlsx`;
    return node_path_1.default.join(generatedExcelRoot, fileName);
}
function resolveApprovedWorkbookPath(projectRoot, input) {
    const explicitPath = clean(input.approvedWorkbookPath || "");
    if (explicitPath) {
        const resolved = node_path_1.default.isAbsolute(explicitPath) ? explicitPath : node_path_1.default.resolve(projectRoot, explicitPath);
        if (node_fs_1.default.existsSync(resolved)) {
            return {
                path: resolved,
                source: "explicit-input"
            };
        }
    }
    const generatedExcelRoot = getGeneratedExcelRoot(projectRoot);
    const candidateBaseNames = getCandidateBaseNames(projectRoot, input);
    const allExcelFiles = node_fs_1.default
        .readdirSync(generatedExcelRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx") && !entry.name.startsWith("~$"))
        .map((entry) => ({
        name: entry.name,
        fullPath: node_path_1.default.join(generatedExcelRoot, entry.name),
        mtimeMs: node_fs_1.default.statSync(node_path_1.default.join(generatedExcelRoot, entry.name)).mtimeMs
    }));
    const exactMatches = allExcelFiles.filter((file) => candidateBaseNames.some((candidate) => file.name.toLowerCase() === `${candidate}.xlsx`.toLowerCase()));
    const fuzzyMatches = allExcelFiles.filter((file) => file.name.includes(String(input.workItemId)));
    const combined = Array.from(new Map([...exactMatches, ...fuzzyMatches].map((file) => [file.fullPath, file])).values()).sort((left, right) => right.mtimeMs - left.mtimeMs);
    if (combined.length > 0) {
        const chosen = combined[0];
        const source = exactMatches.some((file) => file.fullPath === chosen.fullPath)
            ? "generated-excel-exact"
            : "generated-excel-fuzzy";
        return {
            path: chosen.fullPath,
            source
        };
    }
    return null;
}
