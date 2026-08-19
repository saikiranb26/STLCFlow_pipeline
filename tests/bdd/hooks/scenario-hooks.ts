import path from "node:path";
import {
  getGeneratedScenarioResultPath,
  writeGeneratedScenarioResultFile
} from "../../utils/generated-scenario";
import { After, Before, test } from "../steps/bdd";

Before({ tags: "@ui" }, async ({ loginPage, matchShellPage }) => {
  await loginPage.ensureAuthenticated();
  await matchShellPage.waitForShellReady();
});

After({ tags: "@generated" }, async ({ runtime, generatedScenarioState }) => {
  const scenarioFile = generatedScenarioState.scenarioFile;
  if (!scenarioFile) {
    return;
  }

  const testInfo = test.info();
  const attachmentPaths = testInfo.attachments
    .filter((attachment) => !/^generated step \d+/i.test(attachment.name))
    .filter((attachment) => !/^generated scenario final/i.test(attachment.name))
    .map((attachment) => attachment.path)
    .filter((value): value is string => Boolean(value))
    .map((filePath) => path.relative(runtime.projectRoot, filePath));

  const fallbackMessage = testInfo.errors.map((error) => error.message).filter(Boolean).join(" | ") || `Test ended with status ${testInfo.status}.`;
  const result = generatedScenarioState.executionResult || {
    outcome: testInfo.status === "passed" ? ("Passed" as const) : ("Failed" as const),
    classification: testInfo.status === "passed" ? undefined : ("automation-issue" as const),
    comment: fallbackMessage,
    artifactPaths: [] as string[]
  };

  const filePath = getGeneratedScenarioResultPath(runtime.projectRoot, scenarioFile.workItemId, scenarioFile.scenario.key);
  writeGeneratedScenarioResultFile(filePath, {
    generatedAt: new Date().toISOString(),
    workItemId: scenarioFile.workItemId,
    suiteId: scenarioFile.suiteId,
    testPlanId: scenarioFile.testPlanId,
    testCaseId: scenarioFile.scenario.testCaseId,
    scenarioKey: scenarioFile.scenario.key,
    scenarioTitle: scenarioFile.scenario.scenarioTitle,
    title: scenarioFile.scenario.title,
    testStatus: testInfo.status,
    outcome: result.outcome,
    classification: result.classification,
    comment: result.comment,
    failedStep: result.failedStep,
    artifactPaths: Array.from(new Set([...(result.artifactPaths || []), ...attachmentPaths]))
  });
});
