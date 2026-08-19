"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStoryWorkItemSnapshot = fetchStoryWorkItemSnapshot;
const codex_config_1 = require("../../tests/utils/codex-config");
function buildAuthHeaders() {
    const runtime = (0, codex_config_1.loadAdoCodexConfig)();
    const authToken = Buffer.from(`:${runtime.pat}`).toString("base64");
    return {
        Authorization: `Basic ${authToken}`,
        Accept: "application/json"
    };
}
function buildApiUrl(project, relativePath, apiVersionOverride) {
    const runtime = (0, codex_config_1.loadAdoCodexConfig)();
    const separator = runtime.orgUrl.endsWith("/") ? "" : "/";
    const projectPath = `${encodeURIComponent(project)}${relativePath}`;
    const version = apiVersionOverride || runtime.apiVersion;
    return `${runtime.orgUrl}${separator}${projectPath}${relativePath.includes("?") ? "&" : "?"}api-version=${version}`;
}
async function readJsonResponse(response) {
    const text = await response.text();
    if (!text.trim()) {
        return {};
    }
    return JSON.parse(text);
}
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function decodeHtmlEntities(value) {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
}
function stripHtml(value) {
    const withLineBreaks = String(value || "")
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/\s*p\s*>/gi, "\n")
        .replace(/<\/\s*li\s*>/gi, "\n")
        .replace(/<\s*li[^>]*>/gi, "- ")
        .replace(/<\/\s*tr\s*>/gi, "\n")
        .replace(/<\/\s*td\s*>/gi, " ")
        .replace(/<[^>]+>/g, " ");
    return decodeHtmlEntities(withLineBreaks)
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
}
function extractWorkItemIdFromUrl(url) {
    const match = String(url || "").match(/workItems\/(\d+)/i);
    if (!match?.[1]) {
        return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function parseAssignedTo(value) {
    if (!value) {
        return "";
    }
    if (typeof value === "string") {
        return clean(value);
    }
    const display = clean(value.displayName || "");
    const unique = clean(value.uniqueName || "");
    return display && unique ? `${display} <${unique}>` : display || unique;
}
function parseTags(value) {
    return String(value || "")
        .split(";")
        .map((tag) => clean(tag))
        .filter(Boolean);
}
async function fetchLinkedWorkItems(project, ids) {
    if (ids.length === 0) {
        return new Map();
    }
    const url = buildApiUrl(project, "/_apis/wit/workitemsbatch");
    const response = await fetch(url, {
        method: "POST",
        headers: {
            ...buildAuthHeaders(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ids,
            fields: [
                "System.Id",
                "System.Title",
                "System.WorkItemType",
                "System.State"
            ]
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch linked work items: ${response.status} ${response.statusText}`);
    }
    const payload = await readJsonResponse(response);
    const items = Array.isArray(payload.value) ? payload.value : [];
    return new Map(items
        .map((item) => [Number(item.id), item])
        .filter(([id]) => Number.isFinite(id) && id > 0));
}
async function fetchComments(project, workItemId) {
    const url = buildApiUrl(project, `/_apis/wit/workItems/${workItemId}/comments`, "7.0-preview.3");
    const response = await fetch(url, {
        method: "GET",
        headers: buildAuthHeaders()
    });
    if (!response.ok) {
        return [];
    }
    const payload = await readJsonResponse(response);
    return Array.isArray(payload.comments)
        ? payload.comments.map((comment) => stripHtml(comment.text || "")).filter(Boolean)
        : [];
}
function toLinkedSummary(relation, linkedItem) {
    const workItemId = extractWorkItemIdFromUrl(relation.url || "");
    if (!workItemId) {
        return null;
    }
    const fields = linkedItem?.fields || {};
    return {
        workItemId,
        relation: clean(relation.rel || ""),
        title: clean(fields["System.Title"] || ""),
        workItemType: clean(fields["System.WorkItemType"] || ""),
        state: clean(fields["System.State"] || "")
    };
}
async function fetchStoryWorkItemSnapshot(workItemId, project) {
    const url = buildApiUrl(project, `/_apis/wit/workitems/${workItemId}?$expand=relations`);
    const response = await fetch(url, {
        method: "GET",
        headers: buildAuthHeaders()
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Failed to fetch work item ${workItemId}: ${response.status} ${response.statusText}${body ? ` | ${body}` : ""}`);
    }
    const payload = await readJsonResponse(response);
    const fields = payload.fields || {};
    const relations = Array.isArray(payload.relations) ? payload.relations : [];
    const linkedIds = Array.from(new Set(relations.map((relation) => extractWorkItemIdFromUrl(relation.url || "")).filter((id) => Boolean(id))));
    const linkedItems = await fetchLinkedWorkItems(project, linkedIds);
    const comments = await fetchComments(project, workItemId);
    const attachments = relations
        .filter((relation) => clean(relation.rel || "").toLowerCase() === "attachedfile")
        .map((relation) => ({
        name: clean(String(relation.attributes?.name || "")),
        comment: clean(String(relation.attributes?.comment || "")),
        url: clean(relation.url || "")
    }))
        .filter((attachment) => attachment.name || attachment.url);
    const links = relations
        .map((relation) => toLinkedSummary(relation, linkedItems.get(extractWorkItemIdFromUrl(relation.url || "") || 0)))
        .filter((item) => Boolean(item));
    const childTasks = links.filter((item) => item.relation.toLowerCase() === "system.linktypes.hierarchy-forward");
    const relatedBugs = links.filter((item) => item.workItemType.toLowerCase() === "bug" ||
        item.relation.toLowerCase().includes("related") ||
        item.relation.toLowerCase().includes("testedby"));
    return {
        workItemId,
        project,
        title: clean(fields["System.Title"] || ""),
        workItemType: clean(fields["System.WorkItemType"] || ""),
        state: clean(fields["System.State"] || ""),
        areaPath: clean(fields["System.AreaPath"] || ""),
        iterationPath: clean(fields["System.IterationPath"] || ""),
        assignedTo: parseAssignedTo(fields["System.AssignedTo"]),
        productRelease: clean(fields["Safe-Trintech.ProductRelease"] || ""),
        component: clean(fields["Safe-Trintech.Component"] || ""),
        description: stripHtml(fields["System.Description"] || ""),
        acceptanceCriteria: stripHtml(fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || ""),
        reproductionSteps: stripHtml(fields["Microsoft.VSTS.TCM.ReproSteps"] || ""),
        priority: clean(String(fields["Microsoft.VSTS.Common.Priority"] || "")),
        tags: parseTags(fields["System.Tags"] || ""),
        comments,
        attachments,
        links,
        childTasks,
        relatedBugs,
        fetchedAt: new Date().toISOString()
    };
}
