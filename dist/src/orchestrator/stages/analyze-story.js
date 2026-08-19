"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeStoryStage = analyzeStoryStage;
const story_agent_1 = require("../agents/story-agent");
async function analyzeStoryStage(context) {
    return story_agent_1.storyAgent.analyzeStory(context);
}
