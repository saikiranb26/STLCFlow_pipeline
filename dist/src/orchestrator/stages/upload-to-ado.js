"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToAdoStage = uploadToAdoStage;
const story_agent_1 = require("../agents/story-agent");
async function uploadToAdoStage(context) {
    return story_agent_1.storyAgent.uploadReviewedWorkbook(context);
}
