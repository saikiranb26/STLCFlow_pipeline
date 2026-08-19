"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadWithoutExecutionStages = exports.executeWorkflowStages = exports.uploadWorkflowStages = exports.generateWorkflowStages = exports.fullPlaywrightWorkflowStages = void 0;
const load_references_1 = require("./stages/load-references");
const analyze_story_1 = require("./stages/analyze-story");
const collect_evidence_1 = require("./stages/collect-evidence");
const generate_workbook_1 = require("./stages/generate-workbook");
const review_gate_1 = require("./stages/review-gate");
const upload_to_ado_1 = require("./stages/upload-to-ado");
const generate_automation_1 = require("./stages/generate-automation");
const execute_tests_1 = require("./stages/execute-tests");
const publish_report_1 = require("./stages/publish-report");
exports.fullPlaywrightWorkflowStages = [
    load_references_1.loadReferencesStage,
    analyze_story_1.analyzeStoryStage,
    collect_evidence_1.collectEvidenceStage,
    generate_workbook_1.generateWorkbookStage,
    review_gate_1.reviewGateStage,
    upload_to_ado_1.uploadToAdoStage,
    generate_automation_1.generateAutomationStage,
    execute_tests_1.executeTestsStage,
    publish_report_1.publishReportStage
];
exports.generateWorkflowStages = [
    load_references_1.loadReferencesStage,
    analyze_story_1.analyzeStoryStage,
    collect_evidence_1.collectEvidenceStage,
    generate_workbook_1.generateWorkbookStage
];
exports.uploadWorkflowStages = [
    review_gate_1.reviewGateStage,
    upload_to_ado_1.uploadToAdoStage
];
exports.executeWorkflowStages = [
    review_gate_1.reviewGateStage,
    generate_automation_1.generateAutomationStage,
    execute_tests_1.executeTestsStage,
    publish_report_1.publishReportStage
];
exports.uploadWithoutExecutionStages = [
    load_references_1.loadReferencesStage,
    analyze_story_1.analyzeStoryStage,
    collect_evidence_1.collectEvidenceStage,
    generate_workbook_1.generateWorkbookStage,
    review_gate_1.reviewGateStage,
    upload_to_ado_1.uploadToAdoStage
];
