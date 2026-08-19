"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAutomationStage = generateAutomationStage;
const framework_agent_1 = require("../agents/framework-agent");
const locator_agent_1 = require("../agents/locator-agent");
async function generateAutomationStage(context) {
    const locatorPlanPath = locator_agent_1.locatorAgent.prepareLocatorStrategy(context);
    return framework_agent_1.frameworkAgent.generateAutomation(context, locatorPlanPath);
}
