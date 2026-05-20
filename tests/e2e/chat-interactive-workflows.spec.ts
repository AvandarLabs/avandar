import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  getChatComposerInput,
  openChatPanelIfClosed,
} from "./helpers/chatPanelFlow";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * E2E coverage for the chat-interactive-workflows feature
 * (`docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`).
 *
 * These tests mock the OpenRouter call routed through the supabase
 * edge function: every "chat/:workspaceId/messages" request is
 * intercepted and replied to from the test instead of going to the
 * real LLM. We do this for two reasons:
 *
 *   1. Money / determinism — running these against the real model
 *      would cost a fraction of a cent per turn but introduce
 *      flakiness via temperature.
 *   2. Coverage — by controlling the response we can force the
 *      `clarify` (free-text + fixed_options + discovery) and
 *      `proposePlan` tools to fire whenever we want.
 *
 * The "is the real LLM emitting tool calls correctly" question is
 * answered by the manual Playwright walkthrough in
 * `docs/demo-features/chat-interactive-workflows.md`.
 */

type ChatResponse = {
  assistantText: string;
  generatedSql?: { sql: string; prompt: string };
  clarification?: {
    question: string;
    rationale?: string;
    responseShape:
      | { kind: "free_text"; placeholder?: string }
      | { kind: "fixed_options"; options: string[]; multi: boolean }
      | { kind: "discovery"; query: string; column: string; multi: boolean };
    turnNumber: 1 | 2 | 3;
  };
  plan?: {
    steps: Array<{
      id: string;
      description: string;
      type: "sql" | "python" | "r" | "clarification";
      code: string;
      inputs: string[];
      predictedSchema: Array<{ name: string; type: string }>;
      defaultViz?: string;
    }>;
    rootMessage: string;
  };
};

async function mountMockChat(args: {
  page: import("@playwright/test").Page;
  responder: (turnIndex: number, body: unknown) => ChatResponse;
}): Promise<void> {
  const { page, responder } = args;
  let turnIndex = 0;
  await page.route("**/functions/v1/chat/*/messages", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}");
    const response = responder(turnIndex, body);
    turnIndex += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function uploadCsvAndOpenChat(args: {
  page: import("@playwright/test").Page;
  workspaceSlug: string;
}): Promise<void> {
  const { page, workspaceSlug } = args;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`);
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();
  await expect(
    page.getByText("Data processed successfully", { exact: false }),
  ).toBeVisible({ timeout: LONG_WAIT });
  // Click anywhere to dismiss any notifications.
  await page.locator("body").click({ position: { x: 10, y: 10 } });
}

test.describe("chat interactive workflows", () => {
  test("Phase 1 — fixed-options clarification appears inline and the answer is sent back", async ({
    page,
    e2eWorkerDb,
  }) => {
    await mountMockChat({
      page,
      responder: (turnIndex) => {
        if (turnIndex === 0) {
          return {
            assistantText: "Which region do you mean?",
            clarification: {
              question: "Which region do you mean?",
              responseShape: {
                kind: "fixed_options",
                options: ["North", "South"],
                multi: false,
              },
              turnNumber: 1,
            },
          };
        }
        return {
          assistantText: "Here is the SQL.",
          generatedSql: {
            prompt: "show me cases by region",
            sql: 'SELECT 1 AS "result"',
          },
        };
      },
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`);
    await dismissBlockingOverlays(page);

    await openChatPanelIfClosed(page);

    const composer = getChatComposerInput(page);
    await composer.fill("show me cases by region");
    await composer.press("Enter");

    // The clarification card appears (question is also echoed in the thread).
    await expect(
      page.getByText("Which region do you mean?").first(),
    ).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(page.getByRole("radio", { name: "North" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "South" })).toBeVisible();

    // Choose "North" and confirm. The chat Aside clips overflow, so Playwright
    // cannot scroll the radio into the viewport; dispatch the click in-page.
    await page.getByRole("radio", { name: "North" }).evaluate((node) => {
      (node as { click: () => void }).click();
    });
    const confirmButton = page.getByRole("button", { name: /^confirm$/i });
    await expect(confirmButton).toBeEnabled({ timeout: SHORT_WAIT });
    await confirmButton.evaluate((node) => {
      (node as { click: () => void }).click();
    });

    // The next assistant turn fires; "Here is the SQL." appears
    await expect(page.getByText("Here is the SQL.")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
  });

  test("Phase 3 — proposePlan renders a multi-step plan that auto-runs against DuckDB", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    let datasetId = "";

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await uploadCsvAndOpenChat({
        page,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await ensureCloudStorageCheckedAndSaveDataset({
        page,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      const parsedDatasetId = parseDatasetIdFromDataManagerUrl({
        url: page.url(),
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      if (!parsedDatasetId) {
        throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
      }
      datasetId = parsedDatasetId;

      await mountMockChat({
        page,
        responder: () => {
          return {
            assistantText:
              "Filter to confirmed cases, then aggregate by date, then plot.",
            plan: {
              rootMessage:
                "Filter to confirmed cases, then aggregate by date, then plot.",
              steps: [
                {
                  id: "filter_rows",
                  description: "Keep only confirmed cases",
                  type: "sql",
                  code: `SELECT * FROM "${datasetId}" LIMIT 50`,
                  inputs: [],
                  predictedSchema: [
                    { name: "Province_State", type: "varchar" },
                  ],
                },
                {
                  id: "aggregate",
                  description: "Aggregate by day",
                  type: "sql",
                  code: `SELECT COUNT(*)::INTEGER AS "y" FROM "step_filter_rows"`,
                  inputs: ["filter_rows"],
                  predictedSchema: [{ name: "y", type: "integer" }],
                },
              ],
            },
          };
        },
      });
      await pollUntilCloudDatasetToggleShowsOnline(page);
      await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`);
      await dismissBlockingOverlays(page);
      await page.getByRole("button", { name: /^open$/i }).click();
      const openDrawer = page.getByRole("dialog", { name: /open dataset/i });
      await openDrawer
        .getByRole("row")
        .filter({ hasText: "california-covid-sample.csv" })
        .getByRole("button", { name: /^open$/i })
        .click();
      await dismissBlockingOverlays(page);
      await expect
        .poll(
          async () => {
            return page
              .getByRole("columnheader", {
                name: "Province_State",
                exact: true,
              })
              .isVisible();
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);

      await openChatPanelIfClosed(page);

      const composer = getChatComposerInput(page);
      await composer.fill("Break this analysis into steps");
      await composer.press("Enter");

      // The plan view renders with the root message + two step cards
      await expect(page.getByText("Analytic plan")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(page.getByText("Keep only confirmed cases")).toBeVisible();
      await expect(page.getByText("Aggregate by day")).toBeVisible();

      await dismissBlockingOverlays(page);
      const approveButton = page.getByRole("button", {
        name: "Approve and run",
      });
      await expect(approveButton).toBeVisible({ timeout: MEDIUM_WAIT });
      await approveButton.evaluate((node) => {
        (node as { click: () => void }).click();
      });

      // Both steps should eventually succeed after approval (auto-run is
      // default)
      await expect(
        page.getByText("All steps succeeded.", { exact: false }),
      ).toBeVisible({ timeout: LONG_WAIT });
    } finally {
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });
});
// Keep the import to silence "unused" complaints if a future fixture
// regression removes one of these references. They're documentation-
// valuable.
void CALIFORNIA_CSV_EXPECTED_ROW_COUNT;
void SHORT_WAIT;
