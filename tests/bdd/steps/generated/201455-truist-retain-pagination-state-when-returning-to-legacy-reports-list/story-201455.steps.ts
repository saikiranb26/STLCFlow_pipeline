// Story-specific generated step definitions for work item 201455.
import path from "node:path";
import { executeGeneratedScenario } from "../../../../utils/scenario-runner";
import { readGeneratedScenarioFile, type GeneratedScenarioExecutionResult } from "../../../../utils/generated-scenario";
import { Given, Then, When, test } from "../../bdd";
import {
  completeGeneratedScenarioRetainedStateAssertion,
  ensureGeneratedScenarioLoaded,
  executeExpectedGeneratedStep,
  markGeneratedScenarioPassed
} from "../../generated-scenario.steps";

Given("the generated scenario file {string} is loaded", async ({ runtime, generatedScenarioState }, relativePath: string) => {
  const absolutePath = path.join(runtime.projectRoot, relativePath);
  generatedScenarioState.scenarioFile = readGeneratedScenarioFile(absolutePath);
  generatedScenarioState.executionResult = undefined;
  generatedScenarioState.executionCursor = 0;
  generatedScenarioState.currentTaskName = "";
  generatedScenarioState.expectedLegacyPage = "";
  generatedScenarioState.expectedLegacyPageSize = "";
  generatedScenarioState.artifactPaths = [];
});

When("I execute the generated scenario", async ({ runtime, storyPage, loginPage, matchShellPage, generatedScenarioState }) => {
  ensureGeneratedScenarioLoaded(runtime.projectRoot, generatedScenarioState);

  const testInfo = test.info();
  generatedScenarioState.executionResult = await executeGeneratedScenario({
    page: storyPage,
    testInfo,
    loginPage,
    matchShellPage,
    scenarioFile: generatedScenarioState.scenarioFile
  });
});

Then("the generated scenario should finish without blockers", async ({ generatedScenarioState }) => {
  const result: GeneratedScenarioExecutionResult | undefined = generatedScenarioState.executionResult;
  if (!result) {
    throw new Error("Generated scenario execution result is missing.");
  }

  if (result.outcome !== "Passed") {
    const failedStep = result.failedStep?.step ? ` | Failed step: ${result.failedStep.step}` : "";
    throw new Error(`${result.outcome}: ${result.comment}${failedStep}`);
  }
});

Given("I login to Match", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["login"]
  );
});

When("I open the Legacy Reports page", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["gotoLegacyReports"]
  );
});

When("I ensure the Legacy Reports list has more than one page", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsEnsurePaginationAvailable"]
  );
});

When("I go to page {string} on Legacy Reports", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsGoToPage"]
  );
});

When("I set the Legacy Reports page size to a supported value", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsSetPageSize"]
  );
});

When("I open the Actions menu for a report on Legacy Reports", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsOpenActions"]
  );
});

Then("I verify the Legacy Reports Actions menu shows {string}", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsAssertActionsMenu"]
  );
  markGeneratedScenarioPassed(generatedScenarioState);
});

When("I select the {string} action from the Legacy Reports Actions menu", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsSelectAction"]
  );
});

When("I choose the {string} folder and save the Legacy Reports action", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsCompleteFolderAction"]
  );
});

When("I confirm the Legacy Reports delete action", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsConfirmDelete"]
  );
});

When("I return to the Legacy Reports list", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["legacyReportsReturnToList"]
  );
});

When("I click the browser Back button", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["browserBack"]
  );
});

When("I click the browser Forward button", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  await executeExpectedGeneratedStep(
    { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
    ["browserForward"]
  );
});

Then("I verify the Legacy Reports page number is retained", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  const scenarioFile = generatedScenarioState.scenarioFile;
  const cursor = Number(generatedScenarioState.executionCursor || 0);
  const nextStep = scenarioFile?.scenario.executionSteps[cursor];
  if (nextStep?.kind === "legacyReportsAssertRetainedState") {
    await executeExpectedGeneratedStep(
      { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
      ["legacyReportsAssertRetainedState"]
    );
  } else {
    completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState);
  }
  markGeneratedScenarioPassed(generatedScenarioState);
});

Then("I verify the Legacy Reports page size is retained", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  const scenarioFile = generatedScenarioState.scenarioFile;
  const cursor = Number(generatedScenarioState.executionCursor || 0);
  const nextStep = scenarioFile?.scenario.executionSteps[cursor];
  if (nextStep?.kind === "legacyReportsAssertRetainedState") {
    await executeExpectedGeneratedStep(
      { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
      ["legacyReportsAssertRetainedState"]
    );
  } else {
    completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState);
  }
  markGeneratedScenarioPassed(generatedScenarioState);
});

Then("I verify the Legacy Reports page number and page size are retained", async ({ runtime, generatedScenarioState, storyPage, loginPage, matchShellPage }) => {
  const scenarioFile = generatedScenarioState.scenarioFile;
  const cursor = Number(generatedScenarioState.executionCursor || 0);
  const nextStep = scenarioFile?.scenario.executionSteps[cursor];
  if (nextStep?.kind === "legacyReportsAssertRetainedState") {
    await executeExpectedGeneratedStep(
      { runtimeProjectRoot: runtime.projectRoot, generatedScenarioState, storyPage, loginPage, matchShellPage },
      ["legacyReportsAssertRetainedState"]
    );
  } else {
    completeGeneratedScenarioRetainedStateAssertion(generatedScenarioState);
  }
  markGeneratedScenarioPassed(generatedScenarioState);
});
