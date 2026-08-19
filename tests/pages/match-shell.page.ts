import type { Locator, Page } from "@playwright/test";
import { MATCH_SHELL_SELECTORS } from "./match-shell.locators";
import type { AutomationRuntimeConfig } from "../utils/runtime-config";
import { BasePage } from "./base.page";

const SESSION_TIMEOUT_URL = /\/CadencyOAuth\/SSO\/SSOTimeout/i;
const SESSION_TIMEOUT_TEXT = /your session has timed out|cadency timeout|please close your web browser/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNavigationLabel(value: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\btab\b/gi, "")
    .replace(/\bpage\b/gi, "")
    .trim();
}

export class MatchShellPage extends BasePage {
  constructor(page: Page, private readonly runtime: AutomationRuntimeConfig) {
    super(page);
  }

  async gotoScheduler(): Promise<void> {
    await this.page.goto(new URL("/match/en-US/tasks/scheduler", this.runtime.playwright.baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await this.waitForSettled(20_000);
  }

  async gotoTaskHistory(): Promise<void> {
    await this.page.goto(new URL("/match/en-US/tasks/history", this.runtime.playwright.baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await this.waitForSettled(20_000);
  }

  async gotoLegacyReports(): Promise<void> {
    await this.page.goto(new URL("/match/en-US/legacy-reports", this.runtime.playwright.baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await this.waitForSettled(20_000);
  }

  async waitForShellReady(): Promise<void> {
    if (await this.isSessionTimeoutVisible()) {
      throw new Error(`Cadency session timeout page is visible. Current URL: ${this.page.url()}`);
    }

    const visible = await this.page
      .locator(MATCH_SHELL_SELECTORS.shellMarkers)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const onMatchUrl = /\/match\//i.test(this.page.url());
    const loginVisible = await this.page.locator(MATCH_SHELL_SELECTORS.loginUserName).isVisible({ timeout: 1_000 }).catch(() => false);
    if (onMatchUrl && !loginVisible) {
      return;
    }

    if (!visible) {
      throw new Error(`Match shell markers were not visible. Current URL: ${this.page.url()}`);
    }
  }

  private async isSessionTimeoutVisible(): Promise<boolean> {
    if (SESSION_TIMEOUT_URL.test(this.page.url())) {
      return true;
    }

    const bodyText = await this.page.locator("body").innerText({ timeout: 1_000 }).catch(() => "");
    return SESSION_TIMEOUT_TEXT.test(bodyText);
  }

  async navigateByPath(navigationPath: string): Promise<void> {
    const tokens = navigationPath
      .split(">")
      .map((item) => this.clean(item))
      .filter(Boolean)
      .filter((item) => !/^(login into application|login|match|dashboard)$/i.test(item));

    if (tokens.length === 0) {
      throw new Error("Navigation path did not contain any actionable segments.");
    }

    const normalized = tokens.map((item) => normalizeNavigationLabel(item).toLowerCase());
    let routed = false;
    if (normalized.some((item) => /legacy reports?/.test(item))) {
      await this.gotoLegacyReports();
      routed = true;
    } else if (normalized.includes("task history") || normalized.includes("history")) {
      await this.gotoTaskHistory();
      routed = true;
    } else if (normalized.includes("scheduler") || normalized.includes("tasks")) {
      await this.gotoScheduler();
      routed = true;
    }

    let clickedAnyAdditionalToken = false;
    for (const token of tokens) {
      const normalizedToken = normalizeNavigationLabel(token);
      if (routed && /^(tasks|scheduler|history|task history|reports|legacy reports)$/i.test(normalizedToken)) {
        continue;
      }

      const clicked = await this.clickNavigationItem(normalizedToken);
      if (!clicked) {
        throw new Error(`Could not locate navigation item "${normalizedToken}" on ${this.page.url()}.`);
      }

      await this.waitForSettled(15_000);
      clickedAnyAdditionalToken = true;
    }

    if (routed || clickedAnyAdditionalToken) {
      return;
    }

    throw new Error(`Navigation path did not resolve to a known route or clickable item: "${navigationPath}".`);
  }

  private buildNavigationCandidates(label: string): Locator[] {
    const exact = new RegExp(`^\\s*${escapeRegex(label)}\\s*$`, "i");
    const loose = new RegExp(escapeRegex(label), "i");
    const candidates: Locator[] = [];

    for (const selector of MATCH_SHELL_SELECTORS.actionables) {
      candidates.push(this.page.locator(selector, { hasText: exact }));
      candidates.push(this.page.locator(selector, { hasText: loose }));
    }
    for (const selector of MATCH_SHELL_SELECTORS.topNavItems) {
      candidates.push(this.page.locator(selector, { hasText: exact }));
      candidates.push(this.page.locator(selector, { hasText: loose }));
    }

    return candidates;
  }

  async clickNavigationItem(label: string): Promise<boolean> {
    const normalized = normalizeNavigationLabel(label);
    const aliases = Array.from(new Set([
      normalized,
      normalized.replace(/^task\s+/i, ""),
      `${normalized} tab`
    ].filter(Boolean)));

    for (const alias of aliases) {
      const clicked = await this.clickFirstVisible(this.buildNavigationCandidates(alias), 3_000);
      if (clicked) {
        return true;
      }
    }

    return false;
  }
}
