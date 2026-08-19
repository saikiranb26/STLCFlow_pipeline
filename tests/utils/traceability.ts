export function slugifyForAutomation(value: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildAutomationScenarioKey(
  testCaseId: number | undefined,
  title: string,
  fallbackKey?: string
): string {
  const slug = slugifyForAutomation(title) || "scenario";
  if (testCaseId && Number.isFinite(testCaseId)) {
    return `${testCaseId}-${slug}`;
  }

  return fallbackKey || slug;
}

export function buildAutomationScenarioTitle(
  testCaseId: number | undefined,
  title: string,
  fallbackLabel?: string
): string {
  const cleanTitle = String(title || "").replace(/\s+/g, " ").trim();
  if (testCaseId && Number.isFinite(testCaseId)) {
    return `${testCaseId}: ${cleanTitle}`;
  }

  return fallbackLabel ? `${fallbackLabel}: ${cleanTitle}` : cleanTitle;
}

export function buildAutomationFeatureFileName(
  testCaseId: number | undefined,
  title: string,
  fallbackKey?: string
): string {
  const key = buildAutomationScenarioKey(testCaseId, title, fallbackKey);
  return `${key}.feature`;
}

export function buildAutomationFeatureRelativePath(
  workItemId: number,
  testCaseId: number | undefined,
  title: string,
  fallbackKey?: string
): string {
  return `tests/bdd/features/generated/${workItemId}/${buildAutomationFeatureFileName(testCaseId, title, fallbackKey)}`;
}

export function buildGroupedAutomationFeatureFileName(workItemId: number, suiteId: number): string {
  return `story-${workItemId}-suite-${suiteId}.feature`;
}

export function buildGroupedAutomationFeatureRelativePath(workItemId: number, suiteId: number): string {
  return `tests/bdd/features/generated/${workItemId}/${buildGroupedAutomationFeatureFileName(workItemId, suiteId)}`;
}

export function buildGeneratedSpecRelativePath(
  workItemId: number,
  testCaseId: number | undefined,
  title: string,
  fallbackKey?: string
): string {
  const key = buildAutomationScenarioKey(testCaseId, title, fallbackKey);
  return `.features-gen/tests/bdd/features/generated/${workItemId}/${key}.feature.spec.js`;
}

export function buildGroupedGeneratedSpecRelativePath(workItemId: number, suiteId: number): string {
  return `.features-gen/tests/bdd/features/generated/${workItemId}/story-${workItemId}-suite-${suiteId}.feature.spec.js`;
}

export function buildAutomationLookupTokens(input: {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  testCaseId?: number;
  title: string;
}): string[] {
  const title = String(input.title || "").replace(/\s+/g, " ").trim();
  const tokens = [
    `story:${input.workItemId}`,
    `suite:${input.suiteId}`,
    `plan:${input.testPlanId}`,
    title
  ];

  if (input.testCaseId && Number.isFinite(input.testCaseId)) {
    tokens.unshift(`tc:${input.testCaseId}`, String(input.testCaseId));
  }

  return Array.from(new Set(tokens.filter(Boolean)));
}

export function buildAutomationTags(input: {
  workItemId: number;
  suiteId: number;
  testPlanId: number;
  testCaseId?: number;
  extraTags?: string[];
}): string[] {
  const tags = [
    `@story-${input.workItemId}`,
    `@suite-${input.suiteId}`,
    `@plan-${input.testPlanId}`
  ];

  if (input.testCaseId && Number.isFinite(input.testCaseId)) {
    tags.push(`@tc-${input.testCaseId}`);
  }

  return Array.from(new Set([...(input.extraTags || []), ...tags]));
}
