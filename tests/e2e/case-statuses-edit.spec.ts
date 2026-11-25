/*
 * A Case Types editor edits a case type's statuses in one save: adds one,
 * renames one, reorders with the keyboard, changes the default, and removes
 * a status that records use by moving them to another. The case type, its
 * records, and the member's role are seeded before sign-in. Everything the
 * user does goes through the UI.
 */
import { makeObjectFromEntries } from "@avandar/utils";
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
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import type { Locator, Page } from "@playwright/test";

const CASE_TYPE_NAME = "E2E editable statuses";

type AssignResult = Awaited<
  ReturnType<typeof assignE2ESecondaryMemberCustomMatrix>
>;

async function _openEditStatuses(page: Page): Promise<Locator> {
  await page.getByRole("link", { name: "Case Manager" }).click();
  await page.getByRole("button", { name: `Open ${CASE_TYPE_NAME}` }).click();
  await page.getByRole("button", { name: "Edit statuses" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit statuses" });
  await expect(dialog).toBeVisible({ timeout: LONG_WAIT });
  return dialog;
}

async function _editEveryWay(
  options: Readonly<{ page: Page; dialog: Locator }>,
): Promise<void> {
  const { page, dialog } = options;
  const nameInputs = dialog.getByRole("textbox", { name: "Status name" });

  await dialog.getByRole("button", { name: "Add status" }).click();
  await nameInputs.nth(3).fill("Escalated");
  await dialog
    .getByRole("textbox", { name: "Description" })
    .nth(3)
    .fill("Needs a supervisor's review.");
  await nameInputs.nth(0).fill("Open");

  // Escalated moves one place up, above Closed.
  await dialog
    .getByRole("button", { name: "Reorder Escalated" })
    .press("Alt+ArrowUp");
  await expect(nameInputs.nth(2)).toHaveValue("Escalated");

  await dialog
    .getByRole("radio", { name: "Make Inactive the default" })
    .check();

  await dialog.getByRole("button", { name: "Remove Closed" }).click();
  await dialog
    .getByRole("listitem", { name: "Removed: Closed" })
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "Escalated" }).click();
}

async function _readStatusIdsByName(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    caseTypeId: string;
  }>,
): Promise<Record<string, string>> {
  const { data: statuses } = await options.supabaseAdminClient
    .from("concept_statuses")
    .select("id, name")
    .eq("concept_id", options.caseTypeId)
    .throwOnError();
  return makeObjectFromEntries(
    statuses.map((status) => {
      return [status.name, status.id] as const;
    }),
  );
}

async function _expectSavedInDatabase(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    caseType: E2ECaseTypeWithRecords;
  }>,
): Promise<void> {
  const { supabaseAdminClient, caseType } = options;
  const statusIdsByName = await _readStatusIdsByName({
    supabaseAdminClient,
    caseTypeId: caseType.id,
  });
  expect(Object.keys(statusIdsByName).sort()).toEqual([
    "Escalated",
    "Inactive",
    "Open",
  ]);
  const { data: savedCaseType } = await supabaseAdminClient
    .from("concepts")
    .select("default_status_id")
    .eq("id", caseType.id)
    .single()
    .throwOnError();
  expect(savedCaseType.default_status_id).toBe(
    caseType.statusIdsByName.Inactive,
  );
  const { data: movedRecords } = await supabaseAdminClient
    .from("individuals")
    .select("status_id")
    .in("id", [
      caseType.recordIdsByName["Case B"]!,
      caseType.recordIdsByName["Case C"]!,
    ])
    .throwOnError();
  expect(
    movedRecords.map((record) => {
      return record.status_id;
    }),
  ).toEqual([statusIdsByName.Escalated, statusIdsByName.Escalated]);
}

test.describe("editing statuses", () => {
  test("saves added, renamed, and reordered statuses, a new default, and a removed status's records moved to its replacement", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const supabaseAdminClient = e2eViewerMembership.admin;
    let caseType: E2ECaseTypeWithRecords | undefined;
    let assignResult: AssignResult | undefined;
    try {
      caseType = await insertE2ECaseTypeWithRecords({
        supabaseAdminClient,
        workspaceId: e2eViewerMembership.workspaceId,
        name: CASE_TYPE_NAME,
        statuses: [
          {
            name: "Active",
            description: "Open and being worked on.",
            color: "#40c057",
          },
          {
            name: "Inactive",
            description: "No longer being worked on.",
            color: "#637c95",
          },
          {
            name: "Closed",
            description: "Finished and filed.",
            color: "#fa5252",
          },
        ],
        records: [
          { name: "Case A", statusName: "Active" },
          { name: "Case B", statusName: "Closed" },
          { name: "Case C", statusName: "Closed" },
        ],
      });
      assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: {
          ...Permissions.RolesMatrix.Builtins.GlobalViewer,
          case_types: "editor",
        },
      });
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      const dialog = await _openEditStatuses(page);
      await _editEveryWay({ page, dialog });
      await expect(
        dialog.getByText(/find records by status name/),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Save statuses" }).click();
      await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });

      const rows = page
        .getByRole("list", { name: "Statuses" })
        .getByRole("listitem");
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Open");
      await expect(rows.nth(1)).toContainText("Inactive");
      await expect(rows.nth(1)).toContainText("Default");
      await expect(rows.nth(2)).toContainText("Escalated");
      await expect(rows.nth(2)).toContainText("2 records");

      // Oracle: the set, the default, and the moved records are saved.
      await _expectSavedInDatabase({ supabaseAdminClient, caseType });
    } finally {
      if (assignResult) {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
      if (caseType) {
        await deleteE2ECaseTypes({ supabaseAdminClient, ids: [caseType.id] });
      }
    }
  });
});
