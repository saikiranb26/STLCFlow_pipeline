"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTemplate = resolveTemplate;
exports.resolveReferenceRoots = resolveReferenceRoots;
exports.getDefaultReferenceRoots = getDefaultReferenceRoots;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const DEFAULT_TEMPLATE_PATH = "C:\\Users\\bsaikiran\\STLCFlow\\knowledge\\Referenced Template VSTS.xlsx";
const DEFAULT_REFERENCE_ROOTS = [
    {
        planId: 6357,
        suiteId: 70798,
        label: "Master Regression > Match Angular",
        recursive: true,
        source: "default"
    },
    {
        planId: 6357,
        suiteId: 149176,
        label: "Master Regression > TDL",
        recursive: true,
        source: "default"
    },
    {
        planId: 191930,
        suiteId: null,
        label: "Latest Release Match Plan",
        recursive: true,
        source: "default"
    }
];
function normalizeReferenceRoot(root) {
    return {
        planId: root.planId,
        suiteId: typeof root.suiteId === "number" ? root.suiteId : null,
        label: root.label?.trim() ||
            (typeof root.suiteId === "number"
                ? `Plan ${root.planId} / Suite ${root.suiteId}`
                : `Plan ${root.planId}`),
        recursive: root.recursive !== false,
        source: "input"
    };
}
function resolveTemplate(projectRoot, input) {
    const configuredPath = input.templatePath?.trim() || DEFAULT_TEMPLATE_PATH;
    const resolvedPath = node_path_1.default.isAbsolute(configuredPath)
        ? configuredPath
        : node_path_1.default.resolve(projectRoot, configuredPath);
    return {
        path: resolvedPath,
        exists: node_fs_1.default.existsSync(resolvedPath),
        source: input.templatePath?.trim() ? "input" : "default"
    };
}
function resolveReferenceRoots(input) {
    if (input.referenceRoots?.length) {
        return input.referenceRoots.map(normalizeReferenceRoot);
    }
    return DEFAULT_REFERENCE_ROOTS;
}
function getDefaultReferenceRoots() {
    return DEFAULT_REFERENCE_ROOTS;
}
