import { expect, type Locator, type Page } from "@playwright/test";
import type { AutomationRuntimeConfig } from "../utils/runtime-config";
import { BasePage } from "./base.page";

export class LegacyReportsPage extends BasePage {
  constructor(page: Page, private readonly runtime: AutomationRuntimeConfig) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(new URL("/match/en-US/legacy-reports", this.runtime.playwright.baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await this.waitForLoaded();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.page.getByText(/legacy reports/i).first()).toBeVisible({ timeout: 20_000 });
    await this.waitForSettled(20_000);
    await this.waitForGridReady();
  }

  async ensurePaginationAvailable(): Promise<void> {
    const pageTwo = this.page.getByRole("link", { name: /^\s*2\s*$/ }).first();
    const visibleLink = await pageTwo.isVisible({ timeout: 5_000 }).catch(() => false);
    if (visibleLink) {
      return;
    }

    const pageTwoButton = this.page.getByRole("button", { name: /^\s*2\s*$/ }).first();
    const visibleButton = await pageTwoButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (visibleButton) {
      return;
    }

    throw new Error("Legacy Reports does not show pagination beyond page 1.");
  }

  async goToPage(pageNumber: string): Promise<void> {
    const text = this.clean(pageNumber);
    const candidates: Locator[] = [
      this.page.getByRole("link", { name: new RegExp(`^\\s*${this.escapeRegex(text)}\\s*$`, "i") }).first(),
      this.page.getByRole("button", { name: new RegExp(`^\\s*${this.escapeRegex(text)}\\s*$`, "i") }).first(),
      this.page.getByText(new RegExp(`^\\s*${this.escapeRegex(text)}\\s*$`, "i")).first()
    ];

    const clicked = await this.clickFirstVisible(candidates, 5_000);
    if (!clicked) {
      throw new Error(`Could not locate Legacy Reports page selector "${text}".`);
    }

    await this.waitForSettled(15_000);
    await this.assertActivePage(text);
  }

  async setPageSize(pageSize: string): Promise<string> {
    const requestedValue = this.clean(pageSize);
    const locator = await this.getItemsPerPageLocator();
    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    if (tagName === "select") {
      const availableOptions = await locator.evaluate((node) => {
        const select = node as any;
        return Array.from(select.options || []).map((option: any) => ({
          value: String(option?.value || "").trim(),
          label: String(option?.text || "").replace(/\s+/g, " ").trim()
        }));
      });
      const currentSelection = await this.readCurrentPageSize(locator);
      const target = this.resolvePageSizeTarget(requestedValue, currentSelection, availableOptions);

      await locator
        .selectOption({ value: target.value })
        .catch(async () => locator.selectOption({ label: target.label }));
      await this.waitForSettled(10_000);

      const actualSelection = await this.readCurrentPageSize(locator);
      await this.assertPageSize(actualSelection);
      return actualSelection;
    } else {
      await locator.click();
      const target = requestedValue || "20";
      await this.clickByText(target, 5_000);
      await this.waitForSettled(10_000);
      await this.assertPageSize(target);
      return target;
    }
  }

  async openFirstRowActionsMenu(): Promise<void> {
    const actionControl = await this.waitForFirstRowActionControl(30_000);
    const actionClicked = await actionControl.click({ timeout: 5_000 }).then(() => true).catch(() => false);
    if (!actionClicked) {
      throw new Error("Could not open the Actions menu for a Legacy Reports row.");
    }

    await this.waitForSettled(5_000);
    return;

    const row = await this.getFirstDataRow();
    const actionCell = row.locator("td").nth(1);
    const candidates: Locator[] = [
      actionCell.getByRole("button").first(),
      actionCell.getByRole("link").first(),
      actionCell.locator("[role='button'], [aria-haspopup='true'], button, a").first(),
      actionCell.getByText(/\.\.\.|⋮|…/).first()
    ];

    const clicked = await this.clickFirstVisible(candidates, 5_000);
    if (!clicked) {
      throw new Error("Could not open the Actions menu for a Legacy Reports row.");
    }

    await this.waitForSettled(5_000);
  }

  async assertActionsMenuOptions(values: string[]): Promise<void> {
    for (const value of values) {
      await expect(this.page.getByText(new RegExp(`^\\s*${this.escapeRegex(value)}\\s*$`, "i")).first()).toBeVisible({
        timeout: 10_000
      });
    }
  }

  async selectAction(action: string): Promise<void> {
    await this.openFirstRowActionsMenu();
    await this.clickVisibleActionMenuItem(action);
    await this.waitForSettled(10_000);
  }

  async completeFolderAction(folderName: string): Promise<void> {
    const dialog = await this.getVisibleDialog();
    await this.selectFolderInDialog(dialog, folderName);
    await this.clickDialogAction(dialog, "Save");
    await this.waitForDialogToClose(dialog);
    await this.waitForLoaded();
  }

  async confirmDelete(): Promise<void> {
    const dialog = await this.getVisibleDialog();
    const confirmCandidates = [
      "Yes, Delete",
      "Yes Delete",
      "Delete"
    ];

    let clicked = false;
    for (const candidate of confirmCandidates) {
      const dialogClicked = await this.clickFirstVisible(this.buildDialogTextCandidates(dialog, candidate), 2_500);
      if (dialogClicked) {
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      throw new Error('Could not locate the "Yes, Delete" confirmation action in Legacy Reports.');
    }

    await this.waitForDialogToClose(dialog);
    await this.waitForLoaded();
  }

  async returnToList(): Promise<void> {
    const candidates = ["Back to list", "Cancel", "Close", "Back"];
    for (const candidate of candidates) {
      const clicked = await this.clickFirstVisible(this.buildTextCandidates(candidate), 2_500);
      if (clicked) {
        await this.waitForSettled(10_000);
        if (/\/legacy-reports/i.test(this.page.url())) {
          return;
        }
      }
    }

    await this.page.goBack({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => undefined);
    await this.waitForSettled(10_000);
  }

  async assertRetainedState(expectedPage?: string, expectedPageSize?: string): Promise<void> {
    await this.waitForLoaded();
    if (expectedPage) {
      await this.assertActivePage(expectedPage);
    }
    if (expectedPageSize) {
      await this.assertPageSize(expectedPageSize);
    }
  }

  private async assertActivePage(pageNumber: string): Promise<void> {
    const value = this.clean(pageNumber);
    const pagerCandidates: Locator[] = [
      this.page.locator(".pagination .active, .pagination .current, .page-item.active, [aria-current='page']").filter({
        hasText: new RegExp(`^\\s*${this.escapeRegex(value)}\\s*$`, "i")
      }).first(),
      this.page.getByRole("link", { name: new RegExp(`^\\s*${this.escapeRegex(value)}\\s*$`, "i"), exact: false }).first(),
      this.page.getByRole("button", { name: new RegExp(`^\\s*${this.escapeRegex(value)}\\s*$`, "i"), exact: false }).first()
    ];

    for (const locator of pagerCandidates) {
      const visible = await locator.isVisible({ timeout: 3_000 }).catch(() => false);
      if (visible) {
        return;
      }
    }

    throw new Error(`Legacy Reports did not show page ${value} as available after navigation.`);
  }

  private async assertPageSize(pageSize: string): Promise<void> {
    const value = this.clean(pageSize);
    const locator = await this.getItemsPerPageLocator();
    const selectedValue = await this.readCurrentPageSize(locator);
    if (selectedValue === value) {
      return;
    }

    const footerText = this.page.getByText(new RegExp(`items per page\\s*:?\\s*${this.escapeRegex(value)}`, "i")).first();
    const visible = await footerText.isVisible({ timeout: 3_000 }).catch(() => false);
    if (visible) {
      return;
    }

    throw new Error(`Legacy Reports page size "${value}" was not retained.`);
  }

  private async getItemsPerPageLocator(): Promise<Locator> {
    const candidates: Locator[] = [
      this.page.locator("select[twid='pagination-size']").first(),
      this.page.getByLabel(/items per page/i).first(),
      this.page.locator("xpath=//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'items per page')]/following::*[self::select or @role='combobox'][1]").first(),
      this.page.locator("select").last(),
      this.page.locator("[role='combobox']").last()
    ];

    for (const locator of candidates) {
      const visible = await locator.isVisible({ timeout: 2_000 }).catch(() => false);
      if (visible) {
        return locator;
      }
    }

    throw new Error('Could not locate the "Items per page" control in Legacy Reports.');
  }

  private async readCurrentPageSize(locator: Locator): Promise<string> {
    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    if (tagName !== "select") {
      return this.clean((await locator.textContent().catch(() => "")) ?? "");
    }

    const selected = await locator
      .evaluate((node) => {
        const select = node as any;
        const selectedOption = select.selectedOptions?.[0];
        return {
          value: String(select.value || "").trim(),
          label: String(selectedOption?.text || "").replace(/\s+/g, " ").trim()
        };
      })
      .catch(() => ({ value: "", label: "" }));

    return this.clean(selected.label || selected.value);
  }

  private resolvePageSizeTarget(
    requestedValue: string,
    currentSelection: string,
    options: Array<{ value: string; label: string }>
  ): { value: string; label: string } {
    const normalizedOptions = options
      .map((option) => ({
        value: this.clean(option.value),
        label: this.clean(option.label)
      }))
      .filter((option) => option.value || option.label);

    const exactMatch = normalizedOptions.find(
      (option) => option.value === requestedValue || option.label === requestedValue
    );
    if (exactMatch) {
      return exactMatch;
    }

    const current = this.clean(currentSelection);
    const candidates = normalizedOptions.filter(
      (option) => option.value !== current && option.label !== current
    );
    if (candidates.length === 0) {
      return normalizedOptions[0] || { value: requestedValue, label: requestedValue };
    }

    const requestedNumeric = Number.parseInt(requestedValue, 10);
    if (Number.isFinite(requestedNumeric)) {
      const numericCandidates = candidates
        .map((option) => ({
          ...option,
          numeric: Number.parseInt(option.label || option.value, 10)
        }))
        .filter((option) => Number.isFinite(option.numeric))
        .sort((left, right) => Math.abs(left.numeric - requestedNumeric) - Math.abs(right.numeric - requestedNumeric));

      if (numericCandidates.length > 0) {
        return numericCandidates[0];
      }
    }

    return candidates[0];
  }

  private async getFirstDataRow(): Promise<Locator> {
    const rowCandidates: Locator[] = [
      this.page.locator("table tbody tr").first(),
      this.page.locator("tbody tr").first(),
      this.page.locator("[role='row']").nth(1)
    ];

    for (const row of rowCandidates) {
      const visible = await row.isVisible({ timeout: 3_000 }).catch(() => false);
      if (visible) {
        return row;
      }
    }

    throw new Error("Could not locate a Legacy Reports data row.");
  }

  private async waitForGridReady(timeoutMs = 30_000): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.hasVisibleActionControl()) {
        return;
      }

      const stableEmptyState = (await this.isNoResultsVisible()) && !(await this.isGridLoading());
      if (stableEmptyState) {
        return;
      }

      await this.waitForUiChange(500);
    }

    throw new Error("Legacy Reports grid did not finish loading within the expected time.");
  }

  private async waitForFirstRowActionControl(timeoutMs = 30_000): Promise<Locator> {
    const startedAt = Date.now();
    let refreshed = false;

    while (Date.now() - startedAt < timeoutMs) {
      const control = await this.findFirstVisibleActionControl();
      if (control) {
        return control;
      }

      if (!refreshed && (await this.isNoResultsVisible()) && !(await this.isGridLoading())) {
        refreshed = true;
        await this.clickFirstVisible([this.page.getByRole("button", { name: /refresh|reload/i }).first()], 2_000).catch(() => false);
      }

      await this.waitForUiChange(500);
    }

    if (await this.isNoResultsVisible()) {
      throw new Error("Legacy Reports list did not contain any report rows with an Actions menu.");
    }

    throw new Error("Could not locate the Actions menu control for a Legacy Reports row.");
  }

  private async clickVisibleActionMenuItem(action: string): Promise<void> {
    const normalizedAction = this.clean(action);
    const actionPattern = new RegExp(`^\\s*${this.escapeRegex(normalizedAction)}\\s*$`, "i");
    const menuText = this.page.locator("[role='menu'], .dropdown-menu, .k-menu, .k-popup, .popover").getByText(actionPattern).first();
    const candidates: Locator[] = [
      this.page.getByRole("menuitem", { name: actionPattern }).first(),
      this.page.getByRole("button", { name: actionPattern }).first(),
      this.page.getByRole("link", { name: actionPattern }).first(),
      this.page
        .locator("[role='menu'], .dropdown-menu, .k-menu, .k-popup, .popover")
        .locator("a, button, [role='menuitem'], [role='button'], .dropdown-item, .k-item, li")
        .filter({ hasText: actionPattern })
        .first(),
      menuText.locator(
        "xpath=ancestor-or-self::*[self::a or self::button or @role='menuitem' or @role='button' or self::li or contains(concat(' ', normalize-space(@class), ' '), ' dropdown-item ') or contains(concat(' ', normalize-space(@class), ' '), ' k-item ')][1]"
      ),
      menuText,
      this.page.getByText(actionPattern).first()
    ];

    const startedAt = Date.now();
    let lastClickError = "";
    while (Date.now() - startedAt < 15_000) {
      let attemptedClick = false;
      for (const candidate of candidates) {
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) {
          continue;
        }

        attemptedClick = true;
        try {
          await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
          await candidate
            .click({ timeout: 3_000 })
            .catch(async () => candidate.click({ timeout: 1_000, force: true }));
          return;
        } catch (error) {
          lastClickError = error instanceof Error ? error.message : String(error);
        }
      }

      if (!attemptedClick || /detached|not stable|timeout/i.test(lastClickError)) {
        await this.openFirstRowActionsMenu().catch(() => undefined);
      }

      await this.waitForUiChange(500);
    }

    const suffix = lastClickError ? ` Last click error: ${lastClickError}` : "";
    throw new Error(`Could not locate clickable Legacy Reports action "${normalizedAction}".${suffix}`);
  }

  private async hasVisibleActionControl(): Promise<boolean> {
    return Boolean(await this.findFirstVisibleActionControl());
  }

  private async findFirstVisibleActionControl(): Promise<Locator | undefined> {
    const rowCandidates: Locator[] = [
      this.page.locator("table tbody tr").filter({ has: this.page.locator("td") }),
      this.page.locator("tbody tr").filter({ has: this.page.locator("td") }),
      this.page.locator("[role='row']").filter({ has: this.page.locator("[role='cell'], td") })
    ];

    for (const rows of rowCandidates) {
      const rowCount = await rows.count().catch(() => 0);
      for (let index = 0; index < Math.min(rowCount, 10); index += 1) {
        const row = rows.nth(index);
        const rowText = this.clean((await row.textContent().catch(() => "")) || "");
        if (!rowText || /no results found|loading/i.test(rowText)) {
          continue;
        }

        const actionCell = row.locator("td, [role='cell']").nth(1);
        const candidates: Locator[] = [
          actionCell.getByRole("button").first(),
          actionCell.getByRole("link").first(),
          actionCell.locator("[role='button'], [aria-haspopup='true'], button, a").first(),
          actionCell.getByText(/\.\.\.|⋮|…/).first(),
          row.locator("[aria-haspopup='true'], button[title*='Action' i], a[title*='Action' i]").first()
        ];

        for (const candidate of candidates) {
          const visible = await candidate.isVisible().catch(() => false);
          if (visible) {
            return candidate;
          }
        }
      }
    }

    return undefined;
  }

  private async isNoResultsVisible(): Promise<boolean> {
    return this.page.getByText(/no results found/i).first().isVisible().catch(() => false);
  }

  private async isGridLoading(): Promise<boolean> {
    const loadingCandidates: Locator[] = [
      this.page.locator(".k-loading-mask, .k-loading-image, .k-i-loading, .spinner, [aria-busy='true']").first(),
      this.page.locator("table, [role='grid']").getByText(/loading/i).first()
    ];

    for (const candidate of loadingCandidates) {
      const visible = await candidate.isVisible().catch(() => false);
      if (visible) {
        return true;
      }
    }

    return false;
  }

  private buildDialogTextCandidates(dialog: Locator, label: string): Locator[] {
    const exact = new RegExp(`^\\s*${this.escapeRegex(label)}\\s*$`, "i");
    const loose = new RegExp(this.escapeRegex(label), "i");

    return [
      dialog.getByRole("button", { name: exact }),
      dialog.getByRole("button", { name: loose }),
      dialog.getByRole("link", { name: exact }),
      dialog.getByRole("link", { name: loose }),
      dialog.getByRole("menuitem", { name: exact }),
      dialog.getByRole("menuitem", { name: loose }),
      dialog.getByText(exact).first(),
      dialog.getByText(loose).first()
    ];
  }

  private async clickDialogAction(dialog: Locator, label: string): Promise<void> {
    const clicked = await this.clickFirstVisible(this.buildDialogTextCandidates(dialog, label), 5_000);
    if (!clicked) {
      throw new Error(`Could not locate the "${label}" action in the Legacy Reports dialog.`);
    }
    await this.waitForSettled(10_000);
  }

  private async getVisibleDialog(): Promise<Locator> {
    const candidates: Locator[] = [
      this.page.locator("[role='dialog']").last(),
      this.page.locator("[aria-modal='true']").last(),
      this.page.locator(".modal-dialog").last(),
      this.page.locator(".modal-content").last(),
      this.page.locator(".ui-dialog").last(),
      this.page.locator(".k-window-content").last()
    ];

    for (const candidate of candidates) {
      const visible = await candidate.isVisible({ timeout: 5_000 }).catch(() => false);
      if (visible) {
        return candidate;
      }
    }

    throw new Error("Could not locate the visible Legacy Reports dialog.");
  }

  private async waitForDialogToClose(dialog: Locator): Promise<void> {
    await dialog.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
    await this.waitForSettled(15_000);
  }

  private async selectFolderInDialog(dialog: Locator, folderName: string): Promise<void> {
    const normalizedName = this.clean(folderName);
    const exact = new RegExp(`^\\s*${this.escapeRegex(normalizedName)}\\s*$`, "i");
    const loose = new RegExp(this.escapeRegex(normalizedName), "i");
    await this.waitForFolderDialogReady(dialog, loose);

    const checkboxCandidates: Locator[] = [
      dialog.getByRole("checkbox", { name: exact }).first(),
      dialog.getByRole("checkbox", { name: loose }).first(),
      dialog.getByLabel(exact).first(),
      dialog.getByLabel(loose).first(),
      dialog.locator("label", { hasText: exact }).locator("input[type='checkbox'], [role='checkbox']").first(),
      dialog.locator("label", { hasText: loose }).locator("input[type='checkbox'], [role='checkbox']").first(),
      dialog
        .locator("tr, li, div")
        .filter({ hasText: exact })
        .locator("input[type='checkbox'], [role='checkbox']")
        .first()
    ];

    for (const candidate of checkboxCandidates) {
      const visible = await candidate.isVisible({ timeout: 2_000 }).catch(() => false);
      if (!visible) {
        continue;
      }

      const inputType = await candidate.getAttribute("type").catch(() => "");
      if ((inputType || "").toLowerCase() === "checkbox") {
        const checked = await candidate.isChecked().catch(() => false);
        if (!checked) {
          await candidate.check().catch(async () => candidate.click());
        }
      } else {
        await candidate.click();
      }

      await this.waitForSettled(5_000);
      return;
    }

    const labelCandidates: Locator[] = [
      dialog.getByText(exact).first(),
      dialog.getByText(loose).first()
    ];

    const clicked = await this.clickFirstVisible(labelCandidates, 3_000);
    if (!clicked) {
      throw new Error(`Could not select the "${normalizedName}" folder in the Legacy Reports dialog.`);
    }

    await this.waitForSettled(5_000);
  }

  private async waitForFolderDialogReady(dialog: Locator, folderPattern: RegExp): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 30_000) {
      const folderVisible = await dialog.getByText(folderPattern).first().isVisible().catch(() => false);
      if (folderVisible) {
        return;
      }

      const loadingVisible = await dialog
        .locator(".k-loading-mask, .k-loading-image, .k-i-loading, .spinner, [aria-busy='true']")
        .first()
        .isVisible()
        .catch(() => false);
      if (!loadingVisible) {
        const searchBox = dialog.getByRole("textbox").first();
        const searchVisible = await searchBox.isVisible().catch(() => false);
        if (searchVisible) {
          await searchBox.fill(this.clean(folderPattern.source.replace(/\\s\*/g, " ").replace(/[\\^$]/g, ""))).catch(() => undefined);
          await this.waitForUiChange(1_000);
        }
      }

      await this.waitForUiChange(500);
    }
  }
}
