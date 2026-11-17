/*
 * A workspace owner creates a dictionary, pastes a code list, adds a
 * categorical entry that uses it, and saves. Nothing is seeded: the whole
 * flow goes through the UI. The dictionary is deleted afterwards.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

const DICTIONARY_NAME = "E2E measles codes";

test.describe("data dictionaries", () => {
  test("a saved dictionary keeps its pasted code list and the entry that uses it", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await page.getByRole("link", { name: "Data Sources" }).click();

      await page.getByRole("button", { name: "New dictionary" }).click();
      await page.getByRole("menuitem", { name: /Start empty/ }).click();
      const createDialog = page.getByRole("dialog", { name: "New dictionary" });
      await createDialog.getByLabel("Name").fill(DICTIONARY_NAME);
      await createDialog
        .getByRole("button", { name: "Create dictionary" })
        .click();
      await expect(
        page.getByRole("heading", { name: DICTIONARY_NAME }),
      ).toBeVisible({ timeout: LONG_WAIT });

      // Scope to the visible panel: inactive tab panels stay mounted.
      await page.getByRole("tab", { name: /Code lists/ }).click();
      const codeListsPanel = page.getByRole("tabpanel", {
        name: /Code lists/,
      });
      await codeListsPanel
        .getByRole("button", { name: "New code list" })
        .click();
      await codeListsPanel
        .getByLabel("Name", { exact: true })
        .fill("Sex (1/2/9)");
      await codeListsPanel
        .getByRole("button", { name: "Paste a list" })
        .click();
      const pasteDialog = page.getByRole("dialog", { name: "Paste a list" });
      await pasteDialog
        .getByLabel("Values to add")
        .fill("1 = Male\n2 = Female\n9 = Unknown");
      await pasteDialog.getByRole("button", { name: "Add 3 values" }).click();
      await codeListsPanel
        .getByRole("listitem", { name: "Unknown" })
        .getByLabel("Missing")
        .check();

      await page.getByRole("tab", { name: /Entries/ }).click();
      const entriesPanel = page.getByRole("tabpanel", { name: /Entries/ });
      await entriesPanel.getByRole("button", { name: "Add entry" }).click();
      const pane = entriesPanel.getByRole("complementary", { name: /Edit/ });
      await pane.getByLabel("Name", { exact: true }).fill("sex");
      const aliases = pane.getByLabel("Also matches columns named");
      await aliases.fill("GENDER");
      await aliases.press("Enter");
      await pane.getByLabel("Kind").click();
      await page.getByRole("option", { name: /^Categorical/ }).click();
      await pane.getByLabel("Code list").click();
      await page.getByRole("option", { name: "Sex (1/2/9)" }).click();

      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("Dictionary saved")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(page.getByText(/Version 2/)).toBeVisible();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from("data_dictionaries__entries")
              .select("name")
              .eq("workspace_id", workspaceId);
            return data?.map((row) => {
              return row.name;
            });
          },
          { timeout: MEDIUM_WAIT },
        )
        .toEqual(["sex"]);

      await expect(
        page
          .locator("header")
          .filter({ hasText: DICTIONARY_NAME })
          .getByText(/1 entry/),
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole("button", { name: "sex", exact: true }),
      ).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect(
        page.getByRole("link", { name: DICTIONARY_NAME }),
      ).toBeVisible();

      await page.getByRole("tab", { name: /Code lists/ }).click();
      const savedCodeListsPanel = page.getByRole("tabpanel", {
        name: /Code lists/,
      });
      await expect(
        savedCodeListsPanel.getByLabel("Name", { exact: true }),
      ).toHaveValue("Sex (1/2/9)");
      for (const [rowNumber, label] of [
        [1, "Male"],
        [2, "Female"],
        [3, "Unknown"],
      ] as const) {
        await expect(
          savedCodeListsPanel.getByLabel(`Target value ${rowNumber}`),
        ).toHaveValue(label);
      }
    } finally {
      await admin
        .from("data_dictionaries")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("name", DICTIONARY_NAME);
    }
  });
});
