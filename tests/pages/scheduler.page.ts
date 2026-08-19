import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class SchedulerPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private expandCreateTaskTypeCandidates(taskType: string): string[] {
    const normalized = this.clean(taskType);
    if (/^import$/i.test(normalized)) {
      return ["Import", "Batch Import", "Import Task"];
    }

    return [normalized];
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/tasks\/scheduler/i, { timeout: 20_000 });
  }

  async openCreateTaskDialog(): Promise<void> {
    await this.waitForLoaded();
    await this.dismissTestEnvironmentDialog();
    const clicked = await this.clickFirstVisible(
      [
        this.page.getByRole("button", { name: /create new task/i }).first(),
        this.page.getByRole("link", { name: /create new task/i }).first(),
        this.page.locator("button, a, [role='button']").filter({ hasText: /create new task|new task/i }).first()
      ],
      10_000
    );
    if (!clicked) {
      throw new Error(`Create new task action was not visible on Scheduler. Current URL: ${this.page.url()}`);
    }
    await this.waitForCreateTaskDialog();
  }

  async openImportTaskConfiguration(taskName: string): Promise<void> {
    await this.openCreateTaskDialog();
    await this.fillTaskName(taskName);
    await this.selectTaskType("Import");
    await this.clickCreateTask();
  }

  private async dismissTestEnvironmentDialog(): Promise<void> {
    const dialog = this.page.getByRole("dialog").filter({ hasText: /test environment/i }).last();
    const visible = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!visible) {
      return;
    }

    const closeButton = dialog.getByRole("button", { name: /close/i }).first();
    const canClose = await closeButton.isVisible({ timeout: 1_000 }).catch(() => false);
    if (canClose) {
      await closeButton.click().catch(() => undefined);
    }
  }

  private async waitForCreateTaskDialog(): Promise<Locator> {
    const heading = this.page.getByRole("heading", { name: /create new recurring task/i }).last();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const candidates: Locator[] = [
      this.page.getByRole("dialog").filter({ has: heading }).last(),
      this.page.locator(".modal-dialog, .ui-dialog, .k-window, .cdk-overlay-pane").filter({ has: heading }).last(),
      this.page.locator("xpath=//*[(@role='dialog' or self::dialog) and .//*[self::h1 or self::h2 or self::h3 or self::h4][contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'create new recurring task')]]").last()
    ];

    for (const candidate of candidates) {
      const visible = await candidate.isVisible({ timeout: 5_000 }).catch(() => false);
      if (visible) {
        return candidate;
      }
    }

    throw new Error("Create new task dialog did not become visible.");
  }

  private async resolveTaskNameInput(dialog: Locator): Promise<Locator> {
    const candidates: Locator[] = [
      dialog.getByLabel(/task name/i).first(),
      dialog.getByRole("textbox", { name: /^name$/i }).first(),
      dialog.getByLabel(/^name$/i).first(),
      dialog.locator("xpath=.//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'task name')]/following::input[1]").first(),
      dialog.locator("input[type='text'], input:not([type])").first()
    ];

    for (const locator of candidates) {
      const visible = await locator.isVisible({ timeout: 2_000 }).catch(() => false);
      if (visible) {
        return locator;
      }
    }

    throw new Error("Task name input was not found in the Create new recurring task dialog.");
  }

  private async fillTaskName(taskName: string): Promise<void> {
    const dialog = await this.waitForCreateTaskDialog();
    const locator = await this.resolveTaskNameInput(dialog);
    await locator.click().catch(() => undefined);
    await locator.fill("");
    await locator.fill(taskName);
  }

  private async resolveTaskTypeControl(dialog: Locator): Promise<Locator> {
    const candidates: Locator[] = [
      dialog.getByRole("combobox", { name: /task type/i }).first(),
      dialog.locator("xpath=.//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'task type')]/following::*[@role='combobox' or self::select][1]").first(),
      dialog.locator("select[name*='TaskType' i], select[id*='TaskType' i]").first(),
      dialog.getByRole("combobox").first()
    ];

    for (const locator of candidates) {
      const visible = await locator.isVisible({ timeout: 2_000 }).catch(() => false);
      if (visible) {
        return locator;
      }
    }

    throw new Error("Task type selector was not found in the Create new recurring task dialog.");
  }

  private async selectTaskType(taskType: string): Promise<void> {
    const dialog = await this.waitForCreateTaskDialog();
    const locator = await this.resolveTaskTypeControl(dialog);
    const candidateLabels = this.expandCreateTaskTypeCandidates(taskType);
    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    if (tagName === "select") {
      for (const label of candidateLabels) {
        const selected = await locator
          .selectOption({ label })
          .then(() => true)
          .catch(async () =>
            locator
              .selectOption(label)
              .then(() => true)
              .catch(() => false)
          );
        if (selected) {
          return;
        }
      }
    }

    await locator.click();
    for (const label of candidateLabels) {
      const optionCandidates: Locator[] = [
        this.page.getByRole("option", { name: new RegExp(`^\\s*${this.escapeRegex(label)}\\s*$`, "i") }).first(),
        this.page.locator("[role='option'], li, .select2-results__option, .k-list-item").filter({
          hasText: new RegExp(`^\\s*${this.escapeRegex(label)}\\s*$`, "i")
        }).first(),
        this.page.getByText(new RegExp(`^\\s*${this.escapeRegex(label)}\\s*$`, "i")).first()
      ];

      for (const option of optionCandidates) {
        const visible = await option.isVisible({ timeout: 3_000 }).catch(() => false);
        if (!visible) {
          continue;
        }

        await option.click();
        return;
      }
    }

    throw new Error(`Task type option "${taskType}" was not visible in the Create new recurring task dialog.`);
  }

  async openTaskTypeDropdown(): Promise<void> {
    const dialog = await this.waitForCreateTaskDialog();
    const locator = await this.resolveTaskTypeControl(dialog);
    await locator.click();
  }

  async selectTaskTypeInCreateDialog(taskType: string): Promise<void> {
    await this.selectTaskType(taskType);
  }

  async submitCreateTaskDialog(): Promise<void> {
    await this.clickCreateTask();
  }

  async setDependentOnAnotherTask(): Promise<void> {
    await this.waitForCreateTaskDialog();
    await this.ui.setCheckbox("Dependent upon the completion of another task", true);
  }

  async selectFirstParentTask(): Promise<void> {
    await this.waitForCreateTaskDialog();
    await this.ui.selectFirstOptionByLabel("Parent task");
  }

  async waitForGridToSettle(timeoutMs = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const overlays = [
        "#oprecs-page-list-source-table-tree-table-loader",
        "#oprecs-page-list-source-table-tree-table-backdrop",
        "#oprecs-page-scheduler-tasks-source-grid .ag-overlay-loading-wrapper:not(.ag-hidden)",
        "#oprecs-scheduler-tasks-source-grid .ag-overlay-loading-wrapper:not(.ag-hidden)",
        ".ag-overlay-loading-wrapper:not(.ag-hidden)",
        ".backdrop.position-absolute",
        ".spinner .fa-spinner",
        ".fa-spinner.fa-spin"
      ];
      let anyVisible = false;
      for (const selector of overlays) {
        const visible = await this.page.locator(selector).first().isVisible({ timeout: 100 }).catch(() => false);
        if (visible) {
          anyVisible = true;
          break;
        }
      }
      if (!anyVisible) {
        return;
      }
      await this.waitForUiChange(250);
    }
  }

  async dismissSaveSuccessAlert(): Promise<void> {
    const candidates: Locator[] = [
      this.page.getByText(/Successfully added new recurring task|Updated scheduled task/i).first(),
      this.page.locator(".alert-success, .toast-success, .notification-success").first()
    ];

    for (const locator of candidates) {
      const visible = await locator.isVisible({ timeout: 500 }).catch(() => false);
      if (!visible) {
        continue;
      }

      await locator.press("Escape").catch(() => undefined);
      return;
    }
  }

  private getListSearchCandidates(): Locator[] {
    const selectors = [
      "#oprecs-list-source-table-header-search-input",
      "#oprecs-page-list-source-table-header-search-input",
      "#oprecs-page-scheduler-tasks-source-grid-header-search-input",
      "#oprecs-scheduler-tasks-source-grid-header-search-input",
      'input[twid="search-input"]',
      "#oprecs-list-source-table-header input.search-input",
      "#oprecs-page-list-source-table-header input.search-input",
      "#oprecs-page-scheduler-tasks-source-grid-header input.search-input",
      "#oprecs-scheduler-tasks-source-grid-header input.search-input",
      "#oprecs-list-source-table-header input[type='search']",
      "#oprecs-page-list-source-table-header input[type='search']",
      "#oprecs-page-scheduler-tasks-source-grid-header input[type='search']",
      "#oprecs-scheduler-tasks-source-grid-header input[type='search']"
    ];
    return selectors.map((selector) => this.page.locator(selector).first());
  }

  private getListRefreshCandidates(): Locator[] {
    const selectors = [
      "#oprecs-page-scheduler-tasks-source-grid-header-toolbar-refresh button",
      "#oprecs-scheduler-tasks-source-grid-header-toolbar-refresh button",
      "#oprecs-page-list-source-table-header-toolbar-refresh button",
      "#oprecs-list-source-table-header-toolbar-refresh button",
      "#oprecs-page-scheduler-tasks-source-grid-header-toolbar-refresh",
      "#oprecs-scheduler-tasks-source-grid-header-toolbar-refresh",
      "#oprecs-page-list-source-table-header-toolbar-refresh",
      "#oprecs-list-source-table-header-toolbar-refresh",
      "button:has(.fa-refresh)",
      "button:has-text('Refresh')"
    ];
    return selectors.map((selector) => this.page.locator(selector).first());
  }

  async waitForSchedulerListReady(timeoutMs = 15_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (/\/tasks\/scheduler/i.test(this.page.url())) {
        let searchVisible = false;
        for (const locator of this.getListSearchCandidates()) {
          searchVisible = await locator.isVisible({ timeout: 150 }).catch(() => false);
          if (searchVisible) {
            break;
          }
        }
        const createVisible = await this.page
          .locator('button:has-text("Create new task"), button:has-text("New task")')
          .first()
          .isVisible({ timeout: 150 })
          .catch(() => false);
        if (searchVisible || createVisible) {
          await this.waitForGridToSettle(5_000).catch(() => undefined);
          return true;
        }
      }
      await this.waitForUiChange(200);
    }
    return false;
  }

  async searchTaskByName(taskName: string): Promise<boolean> {
    const pattern = this.clean(taskName);
    for (const locator of this.getListSearchCandidates()) {
      const visible = await locator.isVisible({ timeout: 500 }).catch(() => false);
      if (!visible) {
        continue;
      }
      await locator.fill("").catch(() => undefined);
      await locator.fill(pattern).catch(() => undefined);
      await this.waitForGridToSettle(5_000).catch(() => undefined);
      return true;
    }
    return false;
  }

  async returnToSchedulerListAfterSave(timeoutMs = 20_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    const backButtons = [
      this.page.locator("#oprecs-page-page-header-title-back-link").first(),
      this.page.getByRole("button", { name: /Back to list/i }).first(),
      this.page.locator('button:has-text("Back to list")').first()
    ];

    while (Date.now() < deadline) {
      await this.dismissSaveSuccessAlert().catch(() => undefined);
      let clicked = false;

      for (const backButton of backButtons) {
        const visible = await backButton.isVisible({ timeout: 250 }).catch(() => false);
        if (!visible) {
          continue;
        }

        await backButton.scrollIntoViewIfNeeded().catch(() => undefined);
        try {
          await backButton.click({ timeout: 1_000 });
          clicked = true;
        } catch {
          try {
            await backButton.click({ timeout: 1_000, force: true });
            clicked = true;
          } catch {
            await backButton.focus().catch(() => undefined);
            await backButton.press("Enter").catch(() => undefined);
            clicked = true;
          }
        }

        if (clicked) {
          break;
        }
      }

      if (!clicked) {
        await this.waitForUiChange(300);
        continue;
      }

      if (await this.waitForSchedulerListReady(4_000)) {
        return true;
      }
      await this.waitForUiChange(400);
    }

    return false;
  }

  private buildLooseTextPattern(label: string): RegExp {
    const escaped = this.escapeRegex(this.clean(label)).replace(/\s+/g, "\\s+");
    return new RegExp(escaped, "i");
  }

  async findTaskRow(taskName: string, timeoutMs = 15_000): Promise<Locator | null> {
    const deadline = Date.now() + timeoutMs;
    let searched = false;
    const pattern = this.buildLooseTextPattern(taskName);

    while (Date.now() < deadline) {
      const gridRows = this.page.locator(
        [
          "#oprecs-page-scheduler-tasks-source-grid .ag-center-cols-container [role='row'][row-index]",
          "#oprecs-scheduler-tasks-source-grid .ag-center-cols-container [role='row'][row-index]",
          ".ag-center-cols-container [role='row'][row-index]"
        ].join(", ")
      );
      const gridRowCount = await gridRows.count().catch(() => 0);
      for (let index = 0; index < Math.min(gridRowCount, 12); index += 1) {
        const candidate = gridRows.nth(index);
        const visible = await candidate.isVisible({ timeout: 250 }).catch(() => false);
        if (!visible) {
          continue;
        }
        const rowText = this.clean((await candidate.textContent().catch(() => "")) || "");
        if (!pattern.test(rowText)) {
          continue;
        }
        return candidate;
      }

      if (!searched) {
        await this.searchTaskByName(taskName);
        searched = true;
        continue;
      }

      const refreshed = await this.clickFirstVisible(this.getListRefreshCandidates(), 1_500).catch(() => false);
      if (refreshed) {
        await this.waitForGridToSettle(5_000).catch(() => undefined);
      }
      await this.waitForUiChange(400);
    }

    return null;
  }

  async reopenTaskByName(taskName: string): Promise<void> {
    const row = await this.findTaskRow(taskName, 15_000);
    if (!row) {
      throw new Error(`The saved task "${taskName}" was not found on the scheduler page.`);
    }

    await row.click().catch(() => undefined);
    await this.waitForUiChange(500);
    const exactLink = this.page.getByRole("link", { name: new RegExp(this.escapeRegex(taskName), "i") }).first();
    const linkVisible = await exactLink.isVisible({ timeout: 2_000 }).catch(() => false);
    if (linkVisible) {
      await exactLink.click();
      return;
    }

    const cell = row.getByText(new RegExp(this.escapeRegex(taskName), "i")).first();
    const cellVisible = await cell.isVisible({ timeout: 2_000 }).catch(() => false);
    if (cellVisible) {
      await cell.click();
      return;
    }

    await row.dblclick().catch(() => undefined);
  }

  async runTaskByName(taskName: string): Promise<void> {
    const returned = await this.returnToSchedulerListAfterSave(20_000);
    if (!returned) {
      throw new Error(`Back to list did not return to the scheduler list after save. Current URL: ${this.page.url()}`);
    }

    const row = await this.findTaskRow(taskName, 15_000);
    if (!row) {
      throw new Error(`The saved task "${taskName}" was not found on the scheduler page after save.`);
    }

    const actionButton = row
      .locator("button.action-dots, button[twid='action-dots-button'], cadency-widgets-action-dots button, button:has(.fa-ellipsis-h)")
      .first();
    const actionVisible = await actionButton.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!actionVisible) {
      throw new Error(`The scheduler row for "${taskName}" was found, but its Actions button was not visible.`);
    }

    await actionButton.click({ timeout: 3_000 }).catch(() => undefined);
    const runCandidates = [
      this.page.locator(".actions-popover .dropdown-menu-item").filter({ hasText: /^Run$/i }).first(),
      this.page.locator(".actions-popover button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator(".dropdown-menu.show .dropdown-menu-item").filter({ hasText: /^Run$/i }).first(),
      this.page.locator(".dropdown-menu.show button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator("[role='menu'] [role='menuitem']").filter({ hasText: /^Run$/i }).first()
    ];
    const runClicked = await this.clickFirstVisible(runCandidates, 4_000);
    if (!runClicked) {
      throw new Error(`The Actions menu opened, but no Run action was available for "${taskName}".`);
    }

    const confirmCandidates = [
      this.page.locator(".modal-dialog button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator("modal-container button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator("[role='dialog'] button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator("#widgets-message-box button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator(".popover button").filter({ hasText: /^Run$/i }).first(),
      this.page.locator(".popover-footer button").filter({ hasText: /^Run$/i }).first()
    ];
    const confirmClicked = await this.clickFirstVisible(confirmCandidates, 8_000);
    if (!confirmClicked) {
      throw new Error(`The scheduler Run action was clicked, but the expected Run confirmation popup did not appear for "${taskName}".`);
    }

    await this.waitForSettled(3_000);
  }

  private async clickCreateTask(): Promise<void> {
    const dialog = await this.waitForCreateTaskDialog();
    const candidates: Locator[] = [
      dialog.getByRole("button", { name: /^create task$/i }).first(),
      dialog.getByText(/^create task$/i).first(),
      dialog.locator("button:visible").filter({ hasText: /create task/i }).first()
    ];

    for (const locator of candidates) {
      const visible = await locator.isVisible({ timeout: 2_000 }).catch(() => false);
      if (!visible) {
        continue;
      }

      const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
      if (tagName === "button") {
        await locator.click();
      } else {
        await locator.click();
      }
      await this.waitForSettled(15_000);
      return;
    }

    throw new Error("Create Task button was not found in the Create new task dialog.");
  }
}
