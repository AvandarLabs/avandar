/*
 * The records list's status filter narrows both the rows and the count in
 * the list header. The case type and its records are seeded before sign-in
 * as the workspace owner. Everything the user does goes through the UI.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteE2ECaseTypes } from "./helpers/insertE2ECaseType";
import { insertE2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import type { E2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import type { Locator, Page } from "@playwright/test";

const CASE_TYPE_NAME = "E2E filtered records";

function _recordLink(page: Page, recordName: string): Locator {
  // A row's name starts with its status dot's label, so match the end.
  return page.getByRole("link", { name: new RegExp(`${recordName}$`) });
}

/**
 * The count beside the list title. `AppListPane` renders it as the
 * paragraph right after its `h3` title.
 */
function _recordCount(page: Page): Locator {
  return page
    .getByRole("heading", { name: CASE_TYPE_NAME, level: 3, exact: true })
    .locator("xpath=following-sibling::p[1]");
}

async function _toggleStatus(
  options: Readonly<{ page: Page; statusName: string }>,
): Promise<void> {
  const { page, statusName } = options;
  const statusFilter = page.getByRole("combobox", { name: "Filter by status" });
  await statusFilter.click();
  await page.getByRole("option", { name: statusName }).click();
  await statusFilter.press("Escape");
}

test.describe("records status filter", () => {
  test("narrows the records list and its count to the chosen statuses", async ({
    page,
    e2eWorkerDb,
  }) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    let caseType: E2ECaseTypeWithRecords | undefined;
    try {
      caseType = await insertE2ECaseTypeWithRecords({
        supabaseAdminClient,
        workspaceId: await getWorkspaceIdBySlug({
          supabaseAdminClient,
          slug: e2eWorkerDb.workspaceSlug,
        }),
        name: CASE_TYPE_NAME,
        statuses: [
          {
            name: "Suspected",
            description: "Not yet tested.",
            color: "#fab005",
          },
          {
            name: "Confirmed",
            description: "Tested positive.",
            color: "#fa5252",
          },
          {
            name: "Ruled out",
            description: "Tested negative.",
            color: "#637c95",
          },
        ],
        records: [
          { name: "Case A", statusName: "Suspected" },
          { name: "Case B", statusName: "Confirmed" },
          { name: "Case C", statusName: "Confirmed" },
          { name: "Case D", statusName: "Ruled out" },
        ],
      });
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await page
        .getByRole("link", { name: CASE_TYPE_NAME, exact: true })
        .click();
      await expect(_recordCount(page)).toHaveText("4", { timeout: LONG_WAIT });

      await _toggleStatus({ page, statusName: "Confirmed" });
      await expect(_recordCount(page)).toHaveText("2");
      await expect(_recordLink(page, "Case B")).toBeVisible();
      await expect(_recordLink(page, "Case C")).toBeVisible();
      await expect(_recordLink(page, "Case A")).toHaveCount(0);
      await expect(_recordLink(page, "Case D")).toHaveCount(0);

      await _toggleStatus({ page, statusName: "Ruled out" });
      await expect(_recordCount(page)).toHaveText("3");
      await expect(_recordLink(page, "Case D")).toBeVisible();
      await expect(_recordLink(page, "Case A")).toHaveCount(0);
    } finally {
      if (caseType) {
        await deleteE2ECaseTypes({ supabaseAdminClient, ids: [caseType.id] });
      }
    }
  });
});
