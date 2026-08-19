import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { MATCH_SHELL_SELECTORS } from "./match-shell.locators";
import type { AutomationRuntimeConfig } from "../utils/runtime-config";
import { BasePage } from "./base.page";

const SESSION_TIMEOUT_URL = /\/CadencyOAuth\/SSO\/SSOTimeout/i;
const SESSION_TIMEOUT_TEXT = /your session has timed out|cadency timeout|please close your web browser/i;

export class LoginPage extends BasePage {
  constructor(page: Page, private readonly runtime: AutomationRuntimeConfig) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.runtime.playwright.baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await this.waitForSettled(20_000);

    if (await this.isSessionTimeoutVisible()) {
      await this.resetExpiredSession();
      await this.page.goto(this.runtime.playwright.baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60_000
      });
      await this.waitForSettled(20_000);
    }

    await this.waitForLoginFormOrAuthenticated(30_000);
  }

  async isLoginVisible(): Promise<boolean> {
    return this.page.locator(MATCH_SHELL_SELECTORS.loginUserName).isVisible({ timeout: 2_000 }).catch(() => false);
  }

  async isSessionTimeoutVisible(): Promise<boolean> {
    if (SESSION_TIMEOUT_URL.test(this.page.url())) {
      return true;
    }

    const bodyText = await this.page.locator("body").innerText({ timeout: 1_000 }).catch(() => "");
    return SESSION_TIMEOUT_TEXT.test(bodyText);
  }

  async isAuthenticated(): Promise<boolean> {
    if (await this.isSessionTimeoutVisible()) {
      return false;
    }

    const onMatchUrl = /\/match\//i.test(this.page.url());
    const shellMarkerVisible = await this.page
      .locator(MATCH_SHELL_SELECTORS.shellMarkers)
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    return (onMatchUrl || shellMarkerVisible) && !(await this.isLoginVisible());
  }

  async loginWithConfiguredUser(): Promise<void> {
    const username = this.page.locator(MATCH_SHELL_SELECTORS.loginUserName);
    const password = this.page.locator(MATCH_SHELL_SELECTORS.loginPassword);
    const submit = this.page.locator(MATCH_SHELL_SELECTORS.loginSubmit).first();

    await expect(username).toBeVisible({ timeout: 20_000 });
    await username.fill(this.runtime.playwright.username);
    await password.fill(this.runtime.playwright.password);
    await Promise.all([
      this.waitForAuthenticationTransition(60_000),
      submit.click()
    ]);
  }

  private async waitForLoginFormOrAuthenticated(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.isSessionTimeoutVisible()) {
        return;
      }

      if ((await this.isLoginVisible()) || (await this.isAuthenticated())) {
        return;
      }

      await this.waitForUiChange(500);
    }
  }

  private async waitForAuthenticationTransition(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.isSessionTimeoutVisible()) {
        await this.resetExpiredSession();
        return;
      }

      if (await this.isAuthenticated()) {
        await this.waitForSettled(10_000);
        return;
      }

      await this.page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => undefined);
      await this.waitForUiChange(1_000);
    }
  }

  private discardStoredAuthState(): void {
    if (!fs.existsSync(this.runtime.authStatePath)) {
      return;
    }

    const backupDir = path.join(path.dirname(this.runtime.authStatePath), "backups");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `auth-state.expired-${timestamp}.json`);

    try {
      fs.mkdirSync(backupDir, { recursive: true });
      fs.renameSync(this.runtime.authStatePath, backupPath);
    } catch {
      try {
        fs.unlinkSync(this.runtime.authStatePath);
      } catch {
        // Keep running; the in-memory browser context can still be cleaned.
      }
    }
  }

  private async resetExpiredSession(): Promise<void> {
    this.discardStoredAuthState();
    await this.page.context().clearCookies().catch(() => undefined);
    await this.page
      .evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      })
      .catch(() => undefined);
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.page.url() || this.page.url() === "about:blank") {
      await this.goto();
    }

    if (await this.isSessionTimeoutVisible()) {
      await this.resetExpiredSession();
      await this.goto();
    }

    if (await this.isAuthenticated()) {
      return;
    }

    if (!(await this.isLoginVisible())) {
      await this.goto();
    }

    await this.waitForLoginFormOrAuthenticated(30_000);
    if (await this.isSessionTimeoutVisible()) {
      await this.resetExpiredSession();
      await this.goto();
    }

    if (await this.isAuthenticated()) {
      return;
    }

    if (await this.isLoginVisible()) {
      await this.loginWithConfiguredUser();
    }

    if (!(await this.isAuthenticated())) {
      await this.page
        .goto(new URL("/match/en-US", this.runtime.playwright.baseUrl).toString(), {
          waitUntil: "domcontentloaded",
          timeout: 60_000
        })
        .catch(() => undefined);
      await this.waitForSettled(20_000);
    }

    if (!(await this.isAuthenticated())) {
      throw new Error("Cadency login did not reach the Match shell.");
    }

    await this.page.context().storageState({ path: this.runtime.authStatePath }).catch(() => undefined);
  }
}
