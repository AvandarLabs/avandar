/*
 * Changing a record's status from the record page. A Case Records editor
 * changes it and reads each status's meaning on the way; a viewer sees the
 * status and its meaning and has no control to change it. The case type,
 * its record, and the member's role are seeded before sign-in. Everything
 * the user does goes through the UI.
 */
import { Permissions } from "$/models/Permissions/Permissions";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberCustomMatrix,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteE2ECaseTypes } from "./helpers/insertE2ECaseType";
import { insertE2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { E2EGlobalViewerMembership } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import type { E2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import type { Page } from "@playwright/test";

const CASE_TYPE_NAME = "E2E record status cases";
const RECORD_NAME = "Case 001";
const SUSPECTED_DESCRIPTION = "Reported but not yet tested.";
const CONFIRMED_DESCRIPTION = "A lab test came back positive.";

type AssignResult = Awaited<
  ReturnType<typeof assignE2ESecondaryMemberCustomMatrix>
>;

function _insertCaseType(
  membership: E2EGlobalViewerMembership,
): Promise<E2ECaseTypeWithRecords> {
  return insertE2ECaseTypeWithRecords({
    supabaseAdminClient: membership.admin,
    workspaceId: membership.workspaceId,
    name: CASE_TYPE_NAME,
    statuses: [
      {
        name: "Suspected",
        description: SUSPECTED_DESCRIPTION,
        color: "#fab005",
      },
      {
        name: "Confirmed",
        description: CONFIRMED_DESCRIPTION,
        color: "#fa5252",
      },
    ],
    records: [{ name: RECORD_NAME, statusName: "Suspected" }],
  });
}

async function _openRecordFromSidebar(page: Page): Promise<void> {
  await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
  await page.getByRole("link", { name: new RegExp(`${RECORD_NAME}$`) }).click();
  await expect(
    page.getByRole("heading", { name: RECORD_NAME, level: 3 }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

test.describe("record status", () => {
  test("saves a Case Records editor's status change and explains each status on its option", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    let caseType: E2ECaseTypeWithRecords | undefined;
    let assignResult: AssignResult | undefined;
    try {
      caseType = await _insertCaseType(e2eViewerMembership);
      assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: {
          ...Permissions.RolesMatrix.Builtins.GlobalViewer,
          case_records: "editor",
        },
      });
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _openRecordFromSidebar(page);

      await page.getByRole("button", { name: "Status: Suspected" }).click();
      const confirmedOption = page.getByRole("menuitem", { name: "Confirmed" });
      await confirmedOption.hover();
      await expect(
        page.getByRole("tooltip").filter({ hasText: CONFIRMED_DESCRIPTION }),
      ).toBeVisible();
      await confirmedOption.click();

      await expect(
        page.getByRole("button", { name: "Status: Confirmed" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("link", { name: new RegExp(`${RECORD_NAME}$`) })
          .getByRole("img", { name: "Confirmed" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      // Oracle: the change reached the database, not only the screen.
      const { data: savedRecord } = await e2eViewerMembership.admin
        .from("individuals")
        .select("status_id")
        .eq("id", caseType.recordIdsByName[RECORD_NAME]!)
        .single()
        .throwOnError();
      expect(savedRecord.status_id).toBe(caseType.statusIdsByName.Confirmed);
    } finally {
      if (assignResult) {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: e2eViewerMembership.admin,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
      if (caseType) {
        await deleteE2ECaseTypes({
          supabaseAdminClient: e2eViewerMembership.admin,
          ids: [caseType.id],
        });
      }
    }
  });

  test("shows a records viewer the status and its meaning with no way to change it", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    let caseType: E2ECaseTypeWithRecords | undefined;
    try {
      caseType = await _insertCaseType(e2eViewerMembership);
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _openRecordFromSidebar(page);

      const recordHeader = page.locator("header").filter({
        has: page.getByRole("heading", { name: RECORD_NAME, level: 3 }),
      });
      const statusBadge = recordHeader.getByText("Suspected", { exact: true });
      await expect(statusBadge).toBeVisible();
      await expect(page.getByRole("button", { name: /^Status:/ })).toHaveCount(
        0,
      );

      await statusBadge.hover();
      await expect(
        page.getByRole("tooltip").filter({ hasText: SUSPECTED_DESCRIPTION }),
      ).toBeVisible();
    } finally {
      if (caseType) {
        await deleteE2ECaseTypes({
          supabaseAdminClient: e2eViewerMembership.admin,
          ids: [caseType.id],
        });
      }
    }
  });
});
