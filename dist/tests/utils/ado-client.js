"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSuiteCases = fetchSuiteCases;
exports.fetchSuitePoints = fetchSuitePoints;
exports.createTestRun = createTestRun;
exports.publishTestResults = publishTestResults;
exports.completeTestRun = completeTestRun;
const runtime_config_1 = require("./runtime-config");
function buildAuthHeaders() {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const authToken = Buffer.from(`:${runtime.ado.pat}`).toString("base64");
    return {
        Authorization: `Basic ${authToken}`,
        Accept: "application/json"
    };
}
function buildApiUrl(project, relativePath) {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const separator = runtime.ado.orgUrl.endsWith("/") ? "" : "/";
    return `${runtime.ado.orgUrl}${separator}${encodeURIComponent(project)}${relativePath}`;
}
async function readJsonResponse(response) {
    const text = await response.text();
    if (!text.trim()) {
        return {};
    }
    return JSON.parse(text);
}
async function fetchSuiteCases(project, testPlanId, suiteId) {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const url = buildApiUrl(project, `/_apis/testplan/Plans/${testPlanId}/Suites/${suiteId}/TestCase?api-version=${runtime.ado.apiVersion}`);
    const response = await fetch(url, {
        method: "GET",
        headers: buildAuthHeaders()
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch suite cases: ${response.status} ${response.statusText}`);
    }
    const payload = await readJsonResponse(response);
    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.value) ? payload.value : [];
    const cases = items
        .map((item) => ({
        id: Number(item?.workItem?.id),
        title: String(item?.workItem?.name || ""),
        revision: 0
    }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.title);
    const revisions = await fetchCaseRevisions(project, cases.map((item) => item.id));
    return cases.map((item) => ({ ...item, revision: revisions.get(item.id) || 1 }));
}
async function fetchSuitePoints(project, testPlanId, suiteId) {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const url = buildApiUrl(project, `/_apis/testplan/Plans/${testPlanId}/Suites/${suiteId}/TestPoint?includePointDetails=false&returnIdentityRef=false&api-version=${runtime.ado.apiVersion}`);
    const response = await fetch(url, {
        method: "GET",
        headers: buildAuthHeaders()
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch suite points: ${response.status} ${response.statusText}`);
    }
    const payload = await readJsonResponse(response);
    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.value) ? payload.value : [];
    return items
        .map((item) => ({
        testCaseId: Number(item?.testCaseReference?.id),
        pointId: Number(item?.id)
    }))
        .filter((item) => Number.isFinite(item.testCaseId) && item.testCaseId > 0 && Number.isFinite(item.pointId) && item.pointId > 0);
}
async function fetchCaseRevisions(project, caseIds) {
    if (caseIds.length === 0) {
        return new Map();
    }
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const url = buildApiUrl(project, `/_apis/wit/workitemsbatch?api-version=${runtime.ado.apiVersion}`);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            ...buildAuthHeaders(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ids: caseIds,
            fields: ["System.Id", "System.Rev"]
        })
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to fetch testcase revisions: ${response.status} ${body}`);
    }
    const payload = await readJsonResponse(response);
    const items = Array.isArray(payload?.value) ? payload.value : [];
    return new Map(items
        .map((item) => [Number(item?.id), Number(item?.fields?.["System.Rev"] || item?.rev || 0)])
        .filter(([id, rev]) => Number.isFinite(id) && id > 0 && Number.isFinite(rev) && rev > 0));
}
async function createTestRun(project, testPlanId, suiteId, pointIds, storyId) {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const url = buildApiUrl(project, `/_apis/test/runs?api-version=${runtime.ado.apiVersion}`);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            ...buildAuthHeaders(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: `STLCFlow Playwright Execution | Story ${storyId || "N/A"} | Suite ${suiteId} | ${new Date().toISOString()}`,
            automated: true,
            state: "InProgress",
            plan: { id: String(testPlanId) },
            pointIds
        })
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to create Azure DevOps test run: ${response.status} ${body}`);
    }
    const payload = await readJsonResponse(response);
    const runId = Number(payload?.id);
    if (!Number.isFinite(runId) || runId <= 0) {
        throw new Error("Azure DevOps test run creation returned an invalid run ID.");
    }
    return { runId };
}
async function publishTestResults(runId, project, suiteCases, suitePoints, results) {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const pointByCaseId = new Map(suitePoints.map((item) => [item.testCaseId, item]));
    const suiteCaseById = new Map(suiteCases.map((item) => [item.id, item]));
    const requestBody = results.map((result) => {
        const point = pointByCaseId.get(result.testCaseId);
        const suiteCase = suiteCaseById.get(result.testCaseId);
        if (!point) {
            throw new Error(`No suite test point was found for testcase ${result.testCaseId}.`);
        }
        if (!suiteCase) {
            throw new Error(`No suite testcase metadata was found for testcase ${result.testCaseId}.`);
        }
        return {
            testCaseTitle: suiteCase.title,
            testCaseId: result.testCaseId,
            testCaseRevision: suiteCase.revision,
            testPointId: point.pointId,
            comment: result.comment,
            errorMessage: result.errorMessage || undefined,
            stackTrace: result.stackTrace || undefined,
            state: "Completed",
            outcome: result.outcome,
            testCase: { id: String(result.testCaseId) },
            testPoint: { id: String(point.pointId) }
        };
    });
    const url = buildApiUrl(project, `/_apis/test/Runs/${runId}/results?api-version=${runtime.ado.apiVersion}`);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            ...buildAuthHeaders(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to publish Azure DevOps results: ${response.status} ${body}`);
    }
    const payload = await readJsonResponse(response);
    const created = Array.isArray(payload) ? payload : Array.isArray(payload?.value) ? payload.value : [];
    return created.map((item, index) => {
        const fallback = requestBody[index];
        return {
            testCaseId: Number(item?.testCase?.id || item?.testCaseId || fallback.testCaseId),
            pointId: Number(item?.testPoint?.id || item?.testPointId || fallback.testPointId),
            resultId: Number(item?.id),
            outcome: String(item?.outcome || fallback.outcome)
        };
    });
}
async function completeTestRun(runId, project, summaryComment) {
    const runtime = (0, runtime_config_1.loadAutomationRuntimeConfig)();
    const url = buildApiUrl(project, `/_apis/test/runs/${runId}?api-version=${runtime.ado.apiVersion}`);
    const payloads = [{ state: "Completed" }, { state: "Completed", comment: summaryComment }];
    let lastError = "";
    for (const payload of payloads) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            const response = await fetch(url, {
                method: "PATCH",
                headers: {
                    ...buildAuthHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                return null;
            }
            const body = await response.text();
            lastError = `Failed to complete Azure DevOps test run ${runId}: ${response.status} ${body}`;
            if (response.status < 500 || attempt === 2) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }
    return lastError || `Failed to complete Azure DevOps test run ${runId}.`;
}
