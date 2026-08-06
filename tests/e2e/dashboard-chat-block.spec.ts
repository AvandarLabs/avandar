import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * E2E coverage for "chat panel in dashboards generates P-blocks" (item #22
 * in `docs/ict4d-demo/FEATURE_CHECKLIST.md`). The OpenRouter call is mocked
 * so we don't burn LLM credits on every CI run; the test verifies the
 * client-side wiring:
 *
 *   1. Open a fresh dashboard editor.
 *   2. Open the chat panel.
 *   3. Type a request and submit.
 *   4. The mocked backend returns a `dashboardBlock` response.
 *   5. A new DataViz P-block appears on the canvas.
 */

type ChatDashboardBlockResponse = {
  assistantText: string;
  dashboardBlock: {
    kind: "DataViz";
    prompt: string;
    sql: string;
    vizType: "bar" | "line" | "area" | "scatter" | "pie" | "table";
  };
};

test.describe("dashboard chat → P-block", () => {
  // NOTE: this spec uploads the full California CSV (~14,700 rows), so by the
  // row-count guideline it looks like a `freshBrowserPage` candidate. It
  // intentionally stays on the shared `page`: the large upload here is only a
  // precondition, and the asserted chart runs a constant mock SQL rather than
  // the dataset, so a freshly-launched browser buys nothing.
  //
  // This test previously flaked because the heavy Puck editor route can finish
  // mounting *after* the (mocked, instant) chat reply queues its DataViz block.
  // When that happened the block was queued before `DashboardEditorView`
  // registered the dashboard as active, and `queuePendingBlock` silently
  // dropped it (see DashboardEditorStateManager): the chat said "Added a bar
  // chart" but the canvas stayed empty. The state manager now buffers a block
  // queued before the editor registers and flushes it on registration, so the
  // ordering no longer matters.
  test("typing a chart request in chat appends a DataViz block to the dashboard", async ({
    page,
    e2eWorkerDb,
  }) => {
    let chatTurns = 0;
    await page.route("**/functions/v1/chat/*/messages", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      chatTurns += 1;
      const response: ChatDashboardBlockResponse = {
        assistantText: "Added a bar chart of California cases.",
        dashboardBlock: {
          kind: "DataViz",
          prompt: "California cases by region",
          sql: 'SELECT 1 AS "state", 1 AS "total_cases"',
          vizType: "bar",
        },
      };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    // Upload a CSV so the editor has data to reference.
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-manager/data-import`);
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
    void CALIFORNIA_CSV_EXPECTED_ROW_COUNT;

    // Create a fresh dashboard.
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/dashboards`);
    await page
      .getByRole("button", { name: "Create a dashboard" })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${e2eWorkerDb.workspaceSlug}/dashboards/edit/`),
      { timeout: LONG_WAIT },
    );

    // Open the chat panel. The toggle in the AppToolbar is labelled
    // "Open chat panel" when collapsed (see ChatAsideToggle); a fresh browser
    // context always starts collapsed.
    const chatToggle = page.getByRole("button", { name: /open chat panel/i });
    if (await chatToggle.isVisible()) {
      await chatToggle.click();
    }

    // The composer should now be enabled on dashboards.
    const composer = page
      .getByPlaceholder(/Ask me to add a chart/i)
      .or(page.locator('[data-testid="composer-input"]'))
      .first();
    await composer.fill("add a bar chart of California cases by region");
    await composer.press("Enter");

    // The assistant text should appear, confirming the round-trip.
    await expect(
      page.getByText(/Added a bar chart of California cases/i),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    expect(chatTurns).toBeGreaterThanOrEqual(1);

    const editorFrame = page.locator("iframe").first().contentFrame();
    await expect(editorFrame.locator(".recharts-bar").first()).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
  });
});
