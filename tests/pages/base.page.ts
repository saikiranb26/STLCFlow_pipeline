import type { Locator, Page } from "@playwright/test";
import { DynamicUiSupport } from "./dynamic-ui";

export class BasePage {
  protected readonly ui: DynamicUiSupport;

  constructor(protected readonly page: Page) {
    this.ui = new DynamicUiSupport(page);
  }

  protected clean(value: string): string {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  protected async waitForSettled(timeoutMs = 15_000): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  }

  protected async waitForUiChange(timeoutMs = 1_000): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  }

  protected async clickFirstVisible(locators: Locator[], timeoutMs = 5_000): Promise<boolean> {
    return this.ui.clickFirstVisible(locators, timeoutMs);
  }

  protected escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  protected buildTextCandidates(label: string): Locator[] {
    return this.ui.buildTextCandidates(label);
  }

  protected async clickByText(label: string, timeoutMs = 5_000): Promise<void> {
    await this.ui.clickText(label, { timeoutMs });
  }
}
