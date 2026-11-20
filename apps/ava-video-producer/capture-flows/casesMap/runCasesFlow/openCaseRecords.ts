import { expect } from "@playwright/test";
import { WAIT, makeWorkspaceUrlFromRoute } from "../casesMapHelpers";
import { getCaseType } from "./getCaseType";
import { getRecordLinks } from "./getRecordLinks";
import type { FlowContext } from "../../captureFlows.types";

/**
 * Opens the case type's records, syncing them first only when the case type
 * is new or its record list is empty.
 *
 * Called by the `cases-sync-records` step of `runCasesFlow`.
 */
export async function openCaseRecords({
  context,
  isNew,
}: Readonly<{
  context: FlowContext;
  isNew: boolean;
}>): Promise<void> {
  const { page } = context;
  const caseType = getCaseType(context);
  let shouldSync = isNew;
  if (!isNew) {
    await page
      .getByRole("button", { name: "View records", exact: true })
      .click();
    const firstRecord = getRecordLinks(page, getCaseType(context).id).first();
    const empty = page.getByText("No records yet", { exact: true });
    await expect(firstRecord.or(empty).first()).toBeVisible({ timeout: WAIT });
    shouldSync = await empty.isVisible();
  }
  if (shouldSync) {
    // Sync resets record IDs and assignments. Never repeat it for populated
    // records.
    if (!isNew) {
      await page.goto(
        makeWorkspaceUrlFromRoute(context, `ontology-designer/${caseType.id}`),
      );
    }
    await page
      .getByRole("button", { name: "Sync records", exact: true })
      .click();
    await page
      .getByText(`Finished syncing ${caseType.name} records`, {
        exact: true,
      })
      .waitFor({ timeout: WAIT });
    caseType.synced = true;
    await page
      .getByRole("button", { name: "View records", exact: true })
      .click();
  }
  await getRecordLinks(page, getCaseType(context).id)
    .first()
    .waitFor({ timeout: WAIT });
}
