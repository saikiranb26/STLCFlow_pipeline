import { expect, type Locator, type Page } from "@playwright/test";

export interface DynamicUiLookupOptions {
  timeoutMs?: number;
}

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCssAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function xpathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }

  return `concat(${value.split("'").map((part) => `'${part}'`).join(', "\'", ')})`;
}

function normalizeOptionText(value: string): string {
  return clean(value).replace(/[.:;,\-]+$/g, "").trim();
}

export class DynamicUiSupport {
  constructor(private readonly page: Page) {}

  buildTextCandidates(label: string): Locator[] {
    const normalized = clean(label);
    const escaped = escapeRegex(normalized);
    const exact = new RegExp(`^\\s*${escaped}\\s*$`, "i");
    const loose = new RegExp(escaped, "i");
    const attr = escapeCssAttribute(normalized);

    return [
      this.page.getByRole("button", { name: exact }),
      this.page.getByRole("link", { name: exact }),
      this.page.getByRole("tab", { name: exact }),
      this.page.getByRole("menuitem", { name: exact }),
      this.page.getByRole("option", { name: exact }),
      this.page.getByRole("checkbox", { name: exact }),
      this.page.getByRole("radio", { name: exact }),
      this.page.getByRole("button", { name: loose }),
      this.page.getByRole("link", { name: loose }),
      this.page.getByRole("tab", { name: loose }),
      this.page.getByRole("menuitem", { name: loose }),
      this.page.getByRole("option", { name: loose }),
      this.page.getByLabel(exact).first(),
      this.page.locator(`[aria-label*="${attr}" i], [title*="${attr}" i], [data-testid*="${attr}" i], [twid*="${attr}" i]`).first(),
      this.page.locator("button, a, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option']").filter({ hasText: exact }).first(),
      this.page.locator("button, a, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option']").filter({ hasText: loose }).first(),
      this.page.getByText(exact).first(),
      this.page.getByText(loose).first()
    ];
  }

  async clickFirstVisible(locators: Locator[], timeoutMs = 5_000): Promise<boolean> {
    for (const locator of locators) {
      const candidate = locator.first();
      const visible = await candidate.isVisible({ timeout: timeoutMs }).catch(() => false);
      if (!visible) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
      await candidate.click({ timeout: timeoutMs }).catch(async () => candidate.click({ timeout: timeoutMs, force: true }));
      return true;
    }

    return false;
  }

  async clickText(label: string, options: DynamicUiLookupOptions = {}): Promise<void> {
    const normalized = clean(label);
    const clicked = await this.clickFirstVisible(this.buildTextCandidates(normalized), options.timeoutMs || 5_000);
    if (!clicked) {
      throw new Error(await this.buildLookupError("clickable text", normalized));
    }
  }

  async assertVisibleText(value: string, timeoutMs = 10_000): Promise<void> {
    const normalized = clean(value);
    const candidates = this.buildTextCandidates(normalized);
    for (const candidate of candidates) {
      const visible = await candidate.first().isVisible({ timeout: Math.min(timeoutMs, 2_000) }).catch(() => false);
      if (visible) {
        return;
      }
    }

    await expect(this.page.getByText(new RegExp(escapeRegex(normalized), "i")).first()).toBeVisible({ timeout: timeoutMs });
  }

  async getFieldLocator(label: string, options: DynamicUiLookupOptions = {}): Promise<Locator> {
    const normalized = clean(label);
    const escaped = escapeRegex(normalized);
    const labelRegex = new RegExp(escaped, "i");
    const attr = escapeCssAttribute(normalized);
    const lowerLiteral = xpathLiteral(normalized.toLowerCase());
    const fieldXPath =
      `//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${lowerLiteral})]` +
      "/following::*[@role='combobox' or @role='textbox' or @role='spinbutton' or @role='checkbox' or @role='radio' or self::select or self::input or self::textarea][1]";

    const candidates: Locator[] = [
      this.page.getByLabel(labelRegex).first(),
      this.page.getByPlaceholder(labelRegex).first(),
      this.page.getByRole("combobox", { name: labelRegex }).first(),
      this.page.getByRole("textbox", { name: labelRegex }).first(),
      this.page.getByRole("spinbutton", { name: labelRegex }).first(),
      this.page.getByRole("checkbox", { name: labelRegex }).first(),
      this.page.getByRole("radio", { name: labelRegex }).first(),
      this.page.locator(`[aria-label*="${attr}" i], [placeholder*="${attr}" i], [name*="${attr}" i], [id*="${attr}" i], [title*="${attr}" i]`).first(),
      this.page.locator(`xpath=${fieldXPath}`).first(),
      this.page
        .getByText(new RegExp(`^\\s*${escaped}\\s*:?(?:\\s*\\*)?\\s*$`, "i"))
        .locator("xpath=following::*[@role='combobox' or @role='textbox' or @role='spinbutton' or @role='checkbox' or @role='radio' or self::select or self::input or self::textarea][1]")
        .first()
    ];

    for (const locator of candidates) {
      const visible = await locator.isVisible({ timeout: options.timeoutMs || 2_000 }).catch(() => false);
      if (visible) {
        return locator;
      }
    }

    throw new Error(await this.buildLookupError("field", normalized));
  }

  async openField(label: string): Promise<void> {
    const locator = await this.getFieldLocator(label);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click({ timeout: 5_000 }).catch(async () => locator.click({ timeout: 5_000, force: true }));
  }

  async fillField(label: string, value: string): Promise<void> {
    const locator = await this.getFieldLocator(label);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click().catch(() => undefined);

    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    const role = await locator.getAttribute("role").catch(() => "");
    if (tagName === "input" || tagName === "textarea" || role === "textbox" || role === "spinbutton") {
      await locator.fill("");
      await locator.fill(value);
      return;
    }

    await locator.pressSequentially(value, { delay: 5 }).catch(async () => {
      await this.page.keyboard.type(value, { delay: 5 });
    });
  }

  async selectField(label: string, value: string): Promise<void> {
    const normalizedValue = normalizeOptionText(value);
    const locator = await this.getFieldLocator(label);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);

    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    if (tagName === "select") {
      const selected = await locator
        .selectOption({ label: normalizedValue })
        .then(() => true)
        .catch(async () =>
          locator
            .selectOption(normalizedValue)
            .then(() => true)
            .catch(async () =>
              locator
                .selectOption({ value: normalizedValue })
                .then(() => true)
                .catch(() => false)
            )
        );
      if (selected) {
        return;
      }
    }

    await locator.click({ timeout: 5_000 }).catch(async () => locator.click({ timeout: 5_000, force: true }));
    await this.clickOption(normalizedValue);
  }

  async multiSelectField(label: string, values: string[]): Promise<void> {
    for (const rawValue of values) {
      const value = normalizeOptionText(rawValue);
      if (!value) {
        continue;
      }
      const locator = await this.getFieldLocator(label);
      await locator.click({ timeout: 5_000 }).catch(async () => locator.click({ timeout: 5_000, force: true }));
      await this.clickOption(value);
    }
  }

  async selectFirstOptionByLabel(label: string): Promise<void> {
    const locator = await this.getFieldLocator(label);
    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    if (tagName === "select") {
      const optionValue = await locator.evaluate((node) => {
        const select = node as any;
        const options = Array.from(select.options || []) as any[];
        const candidate = options.find((option: any) => {
          const text = String(option.text || "").trim();
          const value = String(option.value || "").trim();
          return Boolean(value) && !/select|choose/i.test(text);
        });
        return String(candidate?.value || "");
      });

      if (!optionValue) {
        throw new Error(`No selectable option was found for "${label}".`);
      }

      await locator.selectOption(optionValue);
      return;
    }

    await locator.click({ timeout: 5_000 }).catch(async () => locator.click({ timeout: 5_000, force: true }));
    const options = this.page
      .locator("[role='option'], li, .select2-results__option, .k-list-item, .dropdown-item, .dropdown-menu-item")
      .filter({ hasText: /.+/ });
    const count = await options.count().catch(() => 0);
    for (let index = 0; index < Math.min(count, 20); index += 1) {
      const option = options.nth(index);
      const visible = await option.isVisible({ timeout: 500 }).catch(() => false);
      const text = clean((await option.textContent().catch(() => "")) || "");
      if (!visible || !text || /select|choose/i.test(text)) {
        continue;
      }

      await option.click();
      return;
    }

    throw new Error(`No selectable option list appeared for "${label}".`);
  }

  async assertSingleSelectByLabel(label: string): Promise<void> {
    const locator = await this.getFieldLocator(label);
    const multiple = await locator.getAttribute("multiple").catch(() => null);
    if (multiple !== null) {
      throw new Error(`Field "${label}" allows multiple selections.`);
    }

    const ariaMulti = await locator.getAttribute("aria-multiselectable").catch(() => null);
    expect(ariaMulti === null || ariaMulti === "false").toBeTruthy();
  }

  async setCheckbox(label: string, checked: boolean): Promise<void> {
    const normalized = clean(label);
    const escaped = escapeRegex(normalized);
    const exact = new RegExp(`^\\s*${escaped}\\s*$`, "i");
    const loose = new RegExp(escaped, "i");
    const candidates: Locator[] = [
      this.page.getByRole("checkbox", { name: exact }).first(),
      this.page.getByRole("checkbox", { name: loose }).first(),
      this.page.getByLabel(exact).first(),
      this.page.getByLabel(loose).first(),
      this.page
        .locator("label", { hasText: loose })
        .locator("input[type='checkbox'], [role='checkbox']")
        .first(),
      this.page
        .locator("tr, li, div, cadency-widgets-checkbox, cadency-widgets-radio")
        .filter({ hasText: loose })
        .locator("input[type='checkbox'], [role='checkbox']")
        .first()
    ];

    for (const candidate of candidates) {
      const visible = await candidate.isVisible({ timeout: 1_500 }).catch(() => false);
      if (!visible) {
        continue;
      }

      const tagName = await candidate.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
      const inputType = await candidate.getAttribute("type").catch(() => "");
      if (tagName === "input" && inputType?.toLowerCase() === "checkbox") {
        if (checked) {
          await candidate.check().catch(async () => candidate.click({ force: true }));
        } else {
          await candidate.uncheck().catch(async () => candidate.click({ force: true }));
        }
      } else {
        const isChecked = await candidate.isChecked().catch(() => false);
        if (isChecked !== checked) {
          await candidate.click({ timeout: 5_000 }).catch(async () => candidate.click({ timeout: 5_000, force: true }));
        }
      }
      return;
    }

    const labelClicked = await this.clickFirstVisible(this.buildTextCandidates(normalized), 2_000);
    if (!labelClicked) {
      throw new Error(await this.buildLookupError("checkbox", normalized));
    }
  }

  private async clickOption(value: string): Promise<void> {
    const escaped = escapeRegex(value);
    const exact = new RegExp(`^\\s*${escaped}\\s*$`, "i");
    const loose = new RegExp(escaped, "i");
    const optionCandidates: Locator[] = [
      this.page.getByRole("option", { name: exact }).first(),
      this.page.getByRole("option", { name: loose }).first(),
      this.page.locator("[role='option'], li, .select2-results__option, .k-list-item, .dropdown-item, .dropdown-menu-item").filter({ hasText: exact }).first(),
      this.page.locator("[role='option'], li, .select2-results__option, .k-list-item, .dropdown-item, .dropdown-menu-item").filter({ hasText: loose }).first(),
      this.page.getByText(exact).first(),
      this.page.getByText(loose).first()
    ];

    const clicked = await this.clickFirstVisible(optionCandidates, 5_000);
    if (!clicked) {
      throw new Error(await this.buildLookupError("option", value));
    }
  }

  private async buildLookupError(kind: string, target: string): Promise<string> {
    const visibleActions = await this.page
      .locator("button, a, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], label")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const element = node as any;
            const text = String(element.innerText || element.textContent || element.getAttribute("aria-label") || element.getAttribute("title") || "")
              .replace(/\s+/g, " ")
              .trim();
            return text;
          })
          .filter(Boolean)
          .slice(0, 30)
      )
      .catch(() => []);

    const suffix = visibleActions.length > 0 ? ` Visible actions: ${visibleActions.join(" | ")}` : "";
    return `Could not locate ${kind} "${target}". URL: ${this.page.url()}.${suffix}`;
  }
}
