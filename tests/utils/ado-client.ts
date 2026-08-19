import { loadAutomationRuntimeConfig } from "./runtime-config";

export type AdoExecutionOutcome = "Passed" | "Failed" | "Blocked";

export interface AdoSuiteCase {
  id: number;
  title: string;
  revision: number;
}

export interface AdoSuitePoint {
  testCaseId: number;
  pointId: number;
}

export interface AdoPublishableResult {
  testCaseId: number;
  title: string;
  outcome: AdoExecutionOutcome;
  comment: string;
  errorMessage?: string;
  stackTrace?: string;
}

export interface AdoPublishedResult {
  testCaseId: number;
  pointId: number;
  resultId: number;
  outcome: AdoExecutionOutcome;
}

export interface AdoRunReference {
  runId: number;
  warning?: string;
}

function buildAuthHeaders(): Record<string, string> {
  const runtime = loadAutomationRuntimeConfig();
  const authToken = Buffer.from(`:${runtime.ado.pat}`).toString("base64");
  return {
    Authorization: `Basic ${authToken}`,
    Accept: "application/json"
  };
}

function buildApiUrl(project: string, relativePath: string): string {
  const runtime = loadAutomationRuntimeConfig();
  const separator = runtime.ado.orgUrl.endsWith("/") ? "" : "/";
  return `${runtime.ado.orgUrl}${separator}${encodeURIComponent(project)}${relativePath}`;
}

async function readJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text);
}

export async function fetchSuiteCases(project: string, testPlanId: number, suiteId: number): Promise<AdoSuiteCase[]> {
  const runtime = loadAutomationRuntimeConfig();
  const url = buildApiUrl(
    project,
    `/_apis/testplan/Plans/${testPlanId}/Suites/${suiteId}/TestCase?api-version=${runtime.ado.apiVersion}`
  );
  const response = await fetch(url, {
    method: "GET",
    headers: buildAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch suite cases: ${response.status} ${response.statusText}`);
  }

  const payload = await readJsonResponse(response);
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.value) ? payload.value : [];
  const cases: AdoSuiteCase[] = items
    .map((item: any): AdoSuiteCase => ({
      id: Number(item?.workItem?.id),
      title: String(item?.workItem?.name || ""),
      revision: 0
    }))
    .filter((item: AdoSuiteCase) => Number.isFinite(item.id) && item.id > 0 && item.title);

  const revisions = await fetchCaseRevisions(project, cases.map((item) => item.id));
  return cases.map((item) => ({ ...item, revision: revisions.get(item.id) || 1 }));
}

export async function fetchSuitePoints(project: string, testPlanId: number, suiteId: number): Promise<AdoSuitePoint[]> {
  const runtime = loadAutomationRuntimeConfig();
  const url = buildApiUrl(
    project,
    `/_apis/testplan/Plans/${testPlanId}/Suites/${suiteId}/TestPoint?includePointDetails=false&returnIdentityRef=false&api-version=${runtime.ado.apiVersion}`
  );
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
    .map((item: any): AdoSuitePoint => ({
      testCaseId: Number(item?.testCaseReference?.id),
      pointId: Number(item?.id)
    }))
    .filter((item: AdoSuitePoint) => Number.isFinite(item.testCaseId) && item.testCaseId > 0 && Number.isFinite(item.pointId) && item.pointId > 0);
}

async function fetchCaseRevisions(project: string, caseIds: number[]): Promise<Map<number, number>> {
  if (caseIds.length === 0) {
    return new Map<number, number>();
  }

  const runtime = loadAutomationRuntimeConfig();
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
  return new Map<number, number>(
    items
      .map((item: any) => [Number(item?.id), Number(item?.fields?.["System.Rev"] || item?.rev || 0)] as [number, number])
      .filter(([id, rev]: [number, number]) => Number.isFinite(id) && id > 0 && Number.isFinite(rev) && rev > 0)
  );
}

export async function createTestRun(
  project: string,
  testPlanId: number,
  suiteId: number,
  pointIds: number[],
  storyId?: number
): Promise<AdoRunReference> {
  const runtime = loadAutomationRuntimeConfig();
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

export async function publishTestResults(
  runId: number,
  project: string,
  suiteCases: AdoSuiteCase[],
  suitePoints: AdoSuitePoint[],
  results: AdoPublishableResult[]
): Promise<AdoPublishedResult[]> {
  const runtime = loadAutomationRuntimeConfig();
  const pointByCaseId = new Map<number, AdoSuitePoint>(suitePoints.map((item) => [item.testCaseId, item]));
  const suiteCaseById = new Map<number, AdoSuiteCase>(suiteCases.map((item) => [item.id, item]));

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
  return created.map((item: any, index: number) => {
    const fallback = requestBody[index];
    return {
      testCaseId: Number(item?.testCase?.id || item?.testCaseId || fallback.testCaseId),
      pointId: Number(item?.testPoint?.id || item?.testPointId || fallback.testPointId),
      resultId: Number(item?.id),
      outcome: String(item?.outcome || fallback.outcome) as AdoExecutionOutcome
    };
  });
}

export async function completeTestRun(
  runId: number,
  project: string,
  summaryComment: string
): Promise<string | null> {
  const runtime = loadAutomationRuntimeConfig();
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
