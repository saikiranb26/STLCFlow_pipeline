"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readGeneratedScenarioFile = readGeneratedScenarioFile;
exports.getGeneratedScenarioResultsDir = getGeneratedScenarioResultsDir;
exports.getGeneratedScenarioResultPath = getGeneratedScenarioResultPath;
exports.writeGeneratedScenarioResultFile = writeGeneratedScenarioResultFile;
exports.readGeneratedScenarioResultFile = readGeneratedScenarioResultFile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function readGeneratedScenarioFile(filePath) {
    return JSON.parse(node_fs_1.default.readFileSync(filePath, "utf8"));
}
function getGeneratedScenarioResultsDir(projectRoot, workItemId) {
    return node_path_1.default.join(projectRoot, "artifacts", "stories", String(workItemId), "automation", "execution-results");
}
function getGeneratedScenarioResultPath(projectRoot, workItemId, scenarioKey) {
    return node_path_1.default.join(getGeneratedScenarioResultsDir(projectRoot, workItemId), `${scenarioKey}.result.json`);
}
function writeGeneratedScenarioResultFile(filePath, result) {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(filePath), { recursive: true });
    node_fs_1.default.writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
function readGeneratedScenarioResultFile(filePath) {
    return JSON.parse(node_fs_1.default.readFileSync(filePath, "utf8"));
}
