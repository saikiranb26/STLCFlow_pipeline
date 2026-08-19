import fs from "node:fs";
import { chromium, type Page } from "@playwright/test";
import { ensureAutomationRuntimeDirs, loadAutomationRuntimeConfig } from "./runtime-config";

const SESSION_TIMEOUT_URL = /\/CadencyOAuth\/SSO\/SSOTimeout/i;
const SESSION_TIMEOUT_TEXT = /your session has timed out|cadency timeout|please close your web browser/i;

async function waitForSettled(page: Page, timeoutMs = 15_000): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
}

async function isSessionTimeoutVisible(page: Page): Promise<boolean> {
  if (SESSION_TIMEOUT_URL.test(page.url())) {
    return true;
  }

  const bodyText = await page.locator("body").innerText({ timeout: 1_000 }).catch(() => "");
  return SESSION_TIMEOUT_TEXT.test(bodyText);
}

async function isAuthenticated(page: Page): Promise<boolean> {
  if (await isSessionTimeoutVisible(page)) {
    return false;
  }

  const onMatchUrl = /\/match\//i.test(page.url());
  const loginFieldVisible = await page
    .locator("#UserName, #username, #Password, #password, input[name='username'], input[type='password'], input[type='submit'].loginButton, #kc-login")
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  const appMarkerVisible = await page
    .locator("text=/scheduler|tasks|dashboard/i")
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  return (onMatchUrl || appMarkerVisible) && !loginFieldVisible;
}

async function main(): Promise<void> {
  const runtime = loadAutomationRuntimeConfig();
  ensureAutomationRuntimeDirs(runtime);

  const browser = await chromium.launch({
    channel: runtime.browserChannel,
    headless: false
  });
  const context = await browser.newContext({
    viewport: runtime.viewport,
    ignoreHTTPSErrors: true
  });

  try {
    const page = await context.newPage();
    await page.goto(runtime.playwright.baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForSettled(page, 20_000);

    console.log("");
    console.log("Complete the Cadency login in the opened Chrome window.");
    console.log("When the Match app is visible and the login form is gone, the auth state will be saved automatically.");
    console.log("");

    const timeoutAt = Date.now() + 10 * 60 * 1000;
    while (Date.now() < timeoutAt) {
      if (await isAuthenticated(page)) {
        await context.storageState({ path: runtime.authStatePath });
        console.log(`Saved Playwright auth state: ${runtime.authStatePath}`);
        return;
      }
      await page.waitForLoadState("networkidle", { timeout: 1_500 }).catch(() => undefined);
    }

    throw new Error("Timed out waiting for manual login to complete.");
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

if (!fs.existsSync(process.cwd())) {
  throw new Error("Project root could not be resolved for auth bootstrap.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Playwright auth bootstrap failed: ${message}`);
  process.exit(1);
});
