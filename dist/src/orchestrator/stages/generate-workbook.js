"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkbookStage = generateWorkbookStage;
const story_agent_1 = require("../agents/story-agent");
async function generateWorkbookStage(context) {
    return story_agent_1.storyAgent.generateWorkbook(context);
}
