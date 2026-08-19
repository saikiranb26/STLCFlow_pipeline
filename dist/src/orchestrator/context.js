"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStoryRunInput = loadStoryRunInput;
exports.createFlowContext = createFlowContext;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../utils/fs");
const workbook_conventions_1 = require("./workbook-conventions");
function loadStoryRunInput(filePath) {
    return (0, fs_1.readJson)(filePath);
}
function createFlowContext(projectRoot, input) {
    const outputRoot = input.outputRoot
        ? node_path_1.default.resolve(projectRoot, input.outputRoot)
        : node_path_1.default.join(projectRoot, "artifacts", "stories");
    const storyArtifactsRoot = node_path_1.default.join(outputRoot, String(input.workItemId));
    (0, fs_1.ensureDir)(node_path_1.default.join(projectRoot, "config"));
    (0, fs_1.ensureDir)(node_path_1.default.join(projectRoot, "knowledge"));
    (0, fs_1.ensureDir)(node_path_1.default.join(projectRoot, "tests"));
    (0, workbook_conventions_1.getGeneratedExcelRoot)(projectRoot);
    (0, fs_1.ensureDir)(outputRoot);
    (0, fs_1.ensureDir)(storyArtifactsRoot);
    return {
        projectRoot,
        configRoot: node_path_1.default.join(projectRoot, "config"),
        knowledgeRoot: node_path_1.default.join(projectRoot, "knowledge"),
        testsRoot: node_path_1.default.join(projectRoot, "tests"),
        artifactsRoot: outputRoot,
        storyArtifactsRoot,
        input,
        startedAt: new Date().toISOString()
    };
}
