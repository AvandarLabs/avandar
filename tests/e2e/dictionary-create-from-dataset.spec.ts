/*
 * A workspace owner imports a small line list, opens "Create a dictionary
 * from this dataset" from its menu, has the values of gender suggested, and
 * saves with hosp_yn still unlabeled, which opens Apply for the dataset. The
 * first test agrees to the consent prompt and answers suggestions from a
 * stubbed online route. The second runs them on the scripted offline model
 * and checks that no prompt opened and nothing went online. The imported
 * dataset is a precondition. Everything the tests create is deleted
 * afterwards.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  MEASLES_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page, Route } from "@playwright/test";

const DICTIONARY_NAME = "E2E line list codes";
const SUGGESTIONS_ROUTE =
  "**/functions/v1/chat/*/dictionary-suggestions/dictionary-suggestions-v2";
const SESSION_SECRET_ROUTE = "**/functions/v1/chat/*/session-secret";
const LABELS_REPLY = JSON.stringify({
  labels: [
    { value: "1", label: "Male", isMissing: false },
    { value: "2", label: "Female", isMissing: false },
    { value: "9", label: "Unknown", isMissing: true },
  ],
  description: "Sex recorded at intake.",
});
const DESCRIBE_REPLY = JSON.stringify({
  description: "Where the person was seen.",
});

async function _replyToSuggestions(route: Route): Promise<void> {
  const body = route.request().postDataJSON() as {
    request?: { task?: string };
  };
  const replies: Record<string, string> = {
    labels: LABELS_REPLY,
    describe: DESCRIBE_REPLY,
  };
  const reply = replies[body.request?.task ?? ""] ?? '{"matches":[]}';
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ reply }),
  });
}

/** The consent gate mints its ack token with the chat's session secret. */
async function _replyWithSessionSecret(route: Route): Promise<void> {
  if (route.request().method() !== "GET") {
    await route.fallback();
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      sessionSecret: Buffer.alloc(32, 0x42).toString("base64"),
      issuedAt: Date.now(),
    }),
  });
}

/** Agrees to the consent prompt that a `gender` column opens. */
async function _agreeToSend(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Personal data detected" });
  await dialog
    .getByRole("checkbox", {
      name: "I understand this data will be sent to the AI provider",
    })
    .check();
  await dialog.getByRole("button", { name: "Send" }).click();
}

async function _openCreateFromDataset(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await page
    .getByRole("menuitem", { name: /Create a dictionary from this dataset/ })
    .click();
  await expect(page.getByRole("heading", { name: "Entries" })).toBeVisible({
    timeout: LONG_WAIT,
  });
}

async function _suggestGenderLabels(
  page: Page,
  options: Readonly<{ isOnline: boolean }>,
): Promise<void> {
  await page.getByRole("button", { name: "Next: map values" }).click();
  await page.getByRole("button", { name: /gender \(1\/2\/9\)/ }).click();
  await page.getByRole("button", { name: "Suggest target values" }).click();
  if (options.isOnline) {
    await _agreeToSend(page);
  }
  await expect(
    page.getByRole("textbox", { name: "Target value for 1" }),
  ).toHaveValue("Male", { timeout: MEDIUM_WAIT });
}

test.describe("learning a dictionary from a dataset", () => {
  test("a dictionary learned from a dataset keeps its suggested labels and its source", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    let datasetId: string | undefined;
    await page.route(SESSION_SECRET_ROUTE, _replyWithSessionSecret);
    await page.route(SUGGESTIONS_ROUTE, _replyToSuggestions);
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _openCreateFromDataset(page);
      await expect(
        page.getByRole("textbox", { name: "Name of the entry from GENDER" }),
      ).toHaveValue("gender");
      await _suggestGenderLabels(page, { isOnline: true });
      await page.getByRole("button", { name: "Accept and next list" }).click();
      await page
        .getByRole("button", { name: "Next: describe columns" })
        .click();
      await expect(
        page.getByRole("textbox", { name: "Description of gender" }),
      ).toHaveValue("Sex recorded at intake.");
      await page.getByRole("button", { name: "Next: save" }).click();
      await expect(page.getByText(/have no target value yet/)).toBeVisible();
      await page
        .getByRole("textbox", { name: "Dictionary name" })
        .fill(DICTIONARY_NAME);
      await expect(
        page.getByRole("checkbox", { name: /^Apply it to .+ next$/ }),
      ).toBeChecked();
      await page.getByRole("button", { name: "Create dictionary" }).click();

      // Saving opens Apply with the new dictionary in use. Leave it and
      // open the dictionary from the list.
      await expect(
        page.getByRole("button", { name: `Stop using ${DICTIONARY_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      const applyHeader = page.locator("header").filter({
        has: page.getByRole("heading", {
          name: "Apply dictionaries",
          exact: true,
        }),
      });
      await applyHeader.getByRole("button", { name: "Cancel" }).click();
      await page
        .getByRole("link", { name: DICTIONARY_NAME, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: DICTIONARY_NAME }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect(
        page.getByRole("button", { name: "gender", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("row", { name: /hosp_yn/ })).toContainText(
        "2 values need a target value",
      );
      const { data } = await admin
        .from("data_dictionaries")
        .select("created_from_dataset_ids")
        .eq("workspace_id", workspaceId)
        .eq("name", DICTIONARY_NAME)
        .single()
        .throwOnError();
      expect(data.created_from_dataset_ids).toEqual([datasetId]);
    } finally {
      await admin
        .from("data_dictionaries")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("name", DICTIONARY_NAME);
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });

  test("a column with no value list is described with a suggestion on the Describe columns step", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    let datasetId: string | undefined;
    await page.route(SESSION_SECRET_ROUTE, _replyWithSessionSecret);
    await page.route(SUGGESTIONS_ROUTE, _replyToSuggestions);
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _openCreateFromDataset(page);
      await page.getByRole("button", { name: "Next: map values" }).click();
      await page
        .getByRole("button", { name: "Next: describe columns" })
        .click();
      const onsetDescription = page.getByRole("textbox", {
        name: "Description of onset_dt",
      });
      await expect(onsetDescription).toHaveValue("");
      await page
        .getByRole("button", { name: "Suggest a description for onset_dt" })
        .click();
      await _agreeToSend(page);
      await expect(onsetDescription).toHaveValue("Where the person was seen.", {
        timeout: MEDIUM_WAIT,
      });
      await page.getByRole("button", { name: "Cancel" }).click();
    } finally {
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });

  test("labels are suggested by the offline model when offline mode is on", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    let datasetId: string | undefined;
    let onlineRequestCount = 0;
    await page.route(SUGGESTIONS_ROUTE, async (route) => {
      onlineRequestCount += 1;
      await route.abort();
    });
    await page.addInitScript(
      ({ labelsReply, describeReply }) => {
        window.localStorage.setItem(
          "avandar.offlineChat.isOfflineModeOn",
          "on",
        );
        window.localStorage.setItem(
          "avandar.offlineChat.downloadedModels",
          JSON.stringify({ "Qwen3-4B-q4f16_1-MLC": true }),
        );
        Object.assign(window, {
          __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__: [
            { match: "You label the coded values", response: labelsReply },
            { match: "You describe one column", response: describeReply },
            { match: "You find columns", response: '{"matches":[]}' },
          ],
        });
      },
      { labelsReply: LABELS_REPLY, describeReply: DESCRIBE_REPLY },
    );
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _openCreateFromDataset(page);
      await _suggestGenderLabels(page, { isOnline: false });
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(onlineRequestCount).toBe(0);
      await page.getByRole("button", { name: "Cancel" }).click();
    } finally {
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });
});
