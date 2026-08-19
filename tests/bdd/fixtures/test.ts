import fs from "node:fs";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { test as base } from "playwright-bdd";
import { ImportTaskPage } from "../../pages/import-task.page";
import { LoginPage } from "../../pages/login.page";
import { MatchShellPage } from "../../pages/match-shell.page";
import { SchedulerPage } from "../../pages/scheduler.page";
import type { GeneratedScenarioExecutionResult, GeneratedScenarioFile } from "../../utils/generated-scenario";
import { ensureAutomationRuntimeDirs, loadAutomationRuntimeConfig, type AutomationRuntimeConfig } from "../../utils/runtime-config";

export interface GeneratedScenarioState {
  scenarioFile?: GeneratedScenarioFile;
  executionResult?: GeneratedScenarioExecutionResult;
  executionCursor?: number;
  currentTaskName?: string;
  expectedLegacyPage?: string;
  expectedLegacyPageSize?: string;
  artifactPaths?: string[];
}

export interface StlcWorkerFixtures {
  runtime: AutomationRuntimeConfig;
}

export interface StlcScenarioFixtures {
  storyContext: BrowserContext;
  storyPage: Page;
}

export interface StlcFixtures {
  loginPage: LoginPage;
  matchShellPage: MatchShellPage;
  schedulerPage: SchedulerPage;
  importTaskPage: ImportTaskPage;
  generatedScenarioState: GeneratedScenarioState;
}

export const test = base.extend<StlcFixtures & StlcScenarioFixtures, StlcWorkerFixtures>({
  runtime: [async ({}, use) => {
    const runtime = loadAutomationRuntimeConfig();
    ensureAutomationRuntimeDirs(runtime);
    await use(runtime);
  }, { scope: "worker" }],
  storyContext: async ({ browser, runtime }, use) => {
    const context = await browser.newContext({
      baseURL: runtime.playwright.baseUrl,
      viewport: runtime.viewport,
      ignoreHTTPSErrors: true,
      storageState: fs.existsSync(runtime.authStatePath) ? runtime.authStatePath : undefined
    });
    await use(context);
    await context.close();
  },
  storyPage: async ({ storyContext }, use) => {
    const page = await storyContext.newPage();
    await use(page);
    await page.close();
  },
  loginPage: async ({ storyPage, runtime }, use) => {
    await use(new LoginPage(storyPage, runtime));
  },
  matchShellPage: async ({ storyPage, runtime }, use) => {
    await use(new MatchShellPage(storyPage, runtime));
  },
  schedulerPage: async ({ storyPage }, use) => {
    await use(new SchedulerPage(storyPage));
  },
  importTaskPage: async ({ storyPage }, use) => {
    await use(new ImportTaskPage(storyPage));
  },
  generatedScenarioState: async ({}, use) => {
    await use({
      executionCursor: 0,
      artifactPaths: []
    });
  }
});

export { expect };
