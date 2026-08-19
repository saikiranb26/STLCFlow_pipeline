import { Given, Then, expect } from "./bdd";

Given("the STLCFlow runtime configuration is available", async ({ runtime }) => {
  expect(runtime.playwright.baseUrl).toBeTruthy();
  expect(runtime.ado.project).toBeTruthy();
  expect(runtime.ado.orgUrl).toBeTruthy();
});

Then("the Cadency base URL should be configured", async ({ runtime }) => {
  expect(runtime.playwright.baseUrl).toMatch(/^https?:\/\//i);
});

Then("Azure DevOps defaults should be available", async ({ runtime }) => {
  expect(runtime.ado.project.trim().length).toBeGreaterThan(0);
  expect(runtime.ado.orgUrl).toContain("visualstudio.com");
});
