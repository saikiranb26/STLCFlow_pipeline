"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferScenarioNavigationPath = inferScenarioNavigationPath;
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function stripTrailingPunctuation(value) {
    return clean(value).replace(/[.:;,\-]+$/g, "").trim();
}
function normalizeNavigationToken(value) {
    return stripTrailingPunctuation(value)
        .replace(/^click(?:\s+on)?\s+/i, "")
        .replace(/^on\s+/i, "")
        .replace(/\btab$/i, "")
        .replace(/\bpage$/i, "")
        .trim();
}
function extractExplicitNavigationPath(action) {
    const normalized = clean(action);
    if (/^navigate to page\s+\d+\s+in legacy reports list/i.test(normalized)) {
        return undefined;
    }
    const schedulerMatch = normalized.match(/^navigate to\s+(.+?)\s+and\s+click\s+(.+)$/i);
    if (schedulerMatch?.[1] && schedulerMatch?.[2]) {
        const left = normalizeNavigationToken(schedulerMatch[1]);
        const right = normalizeNavigationToken(schedulerMatch[2]);
        const parts = [left, right].filter(Boolean);
        return parts.join(" > ") || undefined;
    }
    const match = normalized.match(/^navigate to\s+(.+)$/i);
    if (!match?.[1]) {
        return undefined;
    }
    const target = normalizeNavigationToken(match[1]);
    return target || undefined;
}
function inferFromKeywords(text) {
    const lower = text.toLowerCase();
    if (lower.includes("legacy reports")) {
        return "Reports > Legacy Reports";
    }
    if (lower.includes("transaction control")) {
        return "Manage > Transaction Control";
    }
    if (lower.includes("scheduler") ||
        lower.includes("save run now") ||
        lower.includes("child task") ||
        lower.includes("task parameters") ||
        lower.includes("create new task") ||
        lower.includes("recurrence")) {
        return "Tasks > Scheduler";
    }
    if (lower.includes("task history")) {
        return "Tasks > Task History";
    }
    return undefined;
}
function inferScenarioNavigationPath(input) {
    const explicit = clean(input.explicitNavigationPath || "");
    if (explicit) {
        return explicit;
    }
    for (const step of input.manualSteps) {
        const extracted = extractExplicitNavigationPath(step.action);
        if (extracted) {
            return extracted;
        }
    }
    const keywordText = [
        input.title,
        ...input.manualSteps.map((step) => `${step.action} ${step.expected}`)
    ].join(" ");
    return inferFromKeywords(keywordText);
}
