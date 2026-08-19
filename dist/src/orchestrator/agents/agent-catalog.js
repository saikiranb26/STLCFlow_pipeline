"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowAgents = void 0;
exports.getFlowAgentDefinition = getFlowAgentDefinition;
exports.flowAgents = [
    {
        key: "story",
        name: "Story Agent",
        responsibility: "Analyze the ADO story, generate reviewed manual testcase workbooks, and upload approved cases into the target suite.",
        ownsStages: ["analyzeStory", "generateWorkbook", "uploadToAdo"],
        primaryArtifacts: [
            "story-summary.json",
            "coverage-plan.json",
            "workbook-generation-plan.json",
            "ado-upload-plan.json",
            "upload-summary.json"
        ]
    },
    {
        key: "scenarioExploration",
        name: "Scenario Exploration Agent",
        responsibility: "Plan browser-led UI discovery, navigation evidence collection, and Playwright-first exploratory support.",
        ownsStages: ["collectEvidence"],
        primaryArtifacts: ["ui-evidence-plan.json"]
    },
    {
        key: "locator",
        name: "Locator Agent",
        responsibility: "Define stable selector strategy, locator ranking, fallback policy, and locator evidence outputs for generated automation.",
        ownsStages: ["generateAutomation"],
        primaryArtifacts: ["locator-generation-plan.json"]
    },
    {
        key: "framework",
        name: "Framework Agent",
        responsibility: "Generate BDD features, scenario data, traceability metadata, page-object integration, and reusable framework actions.",
        ownsStages: ["generateAutomation"],
        primaryArtifacts: [
            "automation-generation-plan.json",
            "story-automation-manifest.json",
            "story-automation-traceability-index.json"
        ]
    },
    {
        key: "maintenance",
        name: "Maintenance Agent",
        responsibility: "Execute the current uploaded cases, classify failures, preserve artifacts, and prepare self-healing/refactoring guidance.",
        ownsStages: ["executeTests", "publishReport"],
        primaryArtifacts: [
            "maintenance-plan.json",
            "execution-plan.json",
            "execution-summary.json",
            "reporting-plan.json"
        ]
    }
];
function getFlowAgentDefinition(key) {
    const agent = exports.flowAgents.find((candidate) => candidate.key === key);
    if (!agent) {
        throw new Error(`Unknown STLCFlow agent: ${key}`);
    }
    return agent;
}
