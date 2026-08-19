"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTestsStage = executeTestsStage;
const maintenance_agent_1 = require("../agents/maintenance-agent");
async function executeTestsStage(context) {
    return maintenance_agent_1.maintenanceAgent.executeTests(context);
}
