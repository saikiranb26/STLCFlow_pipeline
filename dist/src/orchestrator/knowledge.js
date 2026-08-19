"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKnowledgeArtifactPaths = getKnowledgeArtifactPaths;
exports.loadReferenceRoots = loadReferenceRoots;
exports.loadReferenceSuiteCorpus = loadReferenceSuiteCorpus;
exports.loadReferenceHarvestStatus = loadReferenceHarvestStatus;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = require("../utils/fs");
function getKnowledgeArtifactPaths(knowledgeRoot) {
    return {
        referenceRootsPath: node_path_1.default.join(knowledgeRoot, "reference-roots.ado.json"),
        referenceSuiteCorpusPath: node_path_1.default.join(knowledgeRoot, "reference-suite-corpus.json"),
        referenceHarvestStatusPath: node_path_1.default.join(knowledgeRoot, "reference-harvest-status.json")
    };
}
function loadReferenceRoots(knowledgeRoot) {
    return (0, fs_1.readJson)(getKnowledgeArtifactPaths(knowledgeRoot).referenceRootsPath);
}
function loadReferenceSuiteCorpus(knowledgeRoot) {
    return (0, fs_1.readJson)(getKnowledgeArtifactPaths(knowledgeRoot).referenceSuiteCorpusPath);
}
function loadReferenceHarvestStatus(knowledgeRoot) {
    return (0, fs_1.readJson)(getKnowledgeArtifactPaths(knowledgeRoot).referenceHarvestStatusPath);
}
