import { expect, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class ImportTaskPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.page.getByText(/import type/i).first()).toBeVisible({ timeout: 20_000 });
  }

  async selectImportType(value: string): Promise<void> {
    await this.ui.selectField("Import type", value);
  }

  async openDropdownByLabel(label: string): Promise<void> {
    await this.ui.openField(label);
  }

  async fillByLabelValue(label: string, value: string): Promise<void> {
    await this.ui.fillField(label, value);
  }

  async selectByLabelValue(label: string, value: string): Promise<void> {
    await this.ui.selectField(label, value);
  }

  async multiSelectByLabelValues(label: string, values: string[]): Promise<void> {
    await this.ui.multiSelectField(label, values);
  }

  async setCheckByLabel(label: string, checked: boolean): Promise<void> {
    await this.ui.setCheckbox(label, checked);
  }

  async selectFirstOptionByLabel(label: string): Promise<void> {
    await this.ui.selectFirstOptionByLabel(label);
  }

  async assertSingleSelectByLabel(label: string): Promise<void> {
    await this.ui.assertSingleSelectByLabel(label);
  }

  async assertTextsVisible(values: string[]): Promise<void> {
    for (const value of values) {
      const text = this.clean(value);
      if (!text) {
        continue;
      }
      await this.ui.assertVisibleText(text, 10_000);
    }
  }

  async clickSave(): Promise<void> {
    await this.ui.clickText("Save", { timeoutMs: 10_000 });
    await this.waitForSettled(10_000);
  }

  async clickCancel(): Promise<void> {
    await this.ui.clickText("Cancel", { timeoutMs: 10_000 });
    await this.waitForSettled(5_000);
  }

  async confirmDialog(): Promise<void> {
    for (const candidate of ["Discard", "Leave", "Yes", "OK", "Ok", "Confirm"]) {
      const clicked = await this.clickFirstVisible(this.buildTextCandidates(candidate), 3_000);
      if (clicked) {
        await this.waitForSettled(5_000);
        return;
      }
    }

    throw new Error("No confirmation action was visible after Cancel.");
  }
}
