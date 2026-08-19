"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishReportStage = publishReportStage;
const maintenance_agent_1 = require("../agents/maintenance-agent");
async function publishReportStage(context) {
    return maintenance_agent_1.maintenanceAgent.publishReport(context);
}
