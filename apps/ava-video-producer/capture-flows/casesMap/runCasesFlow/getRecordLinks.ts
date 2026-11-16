import type { Locator, Page } from "@playwright/test";

/**
 * Gets the links to the records of one case type on the current page.
 *
 * Called by the record steps of `runCasesFlow`: `openCaseRecords`,
 * `verifyRecordCount`, and `openFirstRecord`.
 */
export function getRecordLinks(page: Page, caseTypeId: string): Locator {
  return page.locator(`a[href*="/individual-manager/${caseTypeId}/"]`);
}
