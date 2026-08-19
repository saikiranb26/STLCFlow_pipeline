import type { Locator, Page } from "@playwright/test";
import type { AutomationRuntimeConfig } from "../../../utils/runtime-config";
import { LegacyReportsPage } from "../../legacy-reports.page";

export class Story201455Page extends LegacyReportsPage {
  static readonly storyId = 201455;
  static readonly storyFolderName = "201455-truist-retain-pagination-state-when-returning-to-legacy-reports-list";
  static readonly storyTitle = "TRUIST-Retain Pagination State When Returning to Legacy Reports List";

  constructor(page: Page, runtime: AutomationRuntimeConfig) {
    super(page, runtime);
  }

  get legacyReportsHeading(): Locator {
    return this.page.getByText(/legacy reports/i).first();
  }

  get legacyReportsDataRows(): Locator {
    return this.page.locator("table tbody tr").filter({ has: this.page.locator("td") });
  }

  get firstLegacyReportRow(): Locator {
    return this.legacyReportsDataRows.first();
  }

  get firstRowActionCell(): Locator {
    return this.firstLegacyReportRow.locator("td, [role='cell']").nth(1);
  }

  get firstRowActionsButton(): Locator {
    return this.firstRowActionCell.getByRole("button").first();
  }

  get firstRowActionsLink(): Locator {
    return this.firstRowActionCell.getByRole("link").first();
  }

  get itemsPerPageControl(): Locator {
    return this.page.getByLabel(/items per page/i).or(this.page.locator("select[twid='pagination-size']")).first();
  }

  get activePageIndicator(): Locator {
    return this.page.locator(".pagination .active, .pagination .current, .page-item.active, [aria-current='page']").first();
  }

  get visibleDialog(): Locator {
    return this.page.locator("[role='dialog'], [aria-modal='true'], .modal-dialog, .modal-content, .ui-dialog, .k-window-content").last();
  }

  pageNumberControl(pageNumber: string): Locator {
    const pagePattern = new RegExp(`^\\s*${this.escapeRegex(this.clean(pageNumber))}\\s*$`, "i");
    return this.page.getByRole("link", { name: pagePattern }).or(this.page.getByRole("button", { name: pagePattern })).first();
  }

  actionsMenuItem(actionName: string): Locator {
    const actionPattern = new RegExp(`^\\s*${this.escapeRegex(this.clean(actionName))}\\s*$`, "i");
    return this.page.getByRole("menuitem", { name: actionPattern })
      .or(this.page.getByRole("button", { name: actionPattern }))
      .or(this.page.getByRole("link", { name: actionPattern }))
      .first();
  }

  folderCheckbox(folderName: string): Locator {
    const folderPattern = new RegExp(this.escapeRegex(this.clean(folderName)), "i");
    return this.visibleDialog.getByRole("checkbox", { name: folderPattern })
      .or(this.visibleDialog.getByLabel(folderPattern))
      .first();
  }
}
