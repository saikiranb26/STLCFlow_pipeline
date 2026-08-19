"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectEvidenceStage = collectEvidenceStage;
const scenario_exploration_agent_1 = require("../agents/scenario-exploration-agent");
async function collectEvidenceStage(context) {
    return scenario_exploration_agent_1.scenarioExplorationAgent.collectEvidence(context);
}
