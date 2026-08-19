"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.writeJson = writeJson;
exports.writeText = writeText;
exports.readJson = readJson;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function ensureDir(dirPath) {
    node_fs_1.default.mkdirSync(dirPath, { recursive: true });
}
function writeJson(filePath, value) {
    ensureDir(node_path_1.default.dirname(filePath));
    node_fs_1.default.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function writeText(filePath, value) {
    ensureDir(node_path_1.default.dirname(filePath));
    node_fs_1.default.writeFileSync(filePath, value, "utf8");
}
function readJson(filePath) {
    return JSON.parse(node_fs_1.default.readFileSync(filePath, "utf8"));
}
