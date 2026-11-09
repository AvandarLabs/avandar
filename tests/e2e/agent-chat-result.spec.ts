import { execFileSync } from "node:child_process";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * The agent answers on a dashboard page and shows its result in the chat,
 * without leaving the page. The model is mocked at the agent proxy, so the
 * test checks the browser's side: the page block reaches the proxy, the
 * query runs in DuckDB-Wasm, the result card draws, and it runs again after
 * a reload.
 */

const RESULT_SQL = `SELECT 'California' AS "state", 42 AS "cases"`;

/**
 * Where this spec's screenshots go: `.temp/<branch>/`, with the current
 * branch kebab-cased so it is a safe directory name.
 */
function _buildScreenshotPath(fileName: string): string {
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const directory = branch
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `.temp/${directory}/${fileName}`;
}

/** Pi `streamProxy` events for one `run_query` call that ends the turn. */
function _runQueryStream(): string {
  const usage = {
    input: 10,
    output: 5,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 15,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  const toolCall = {
    type: "toolCall",
    id: "call-1",
    name: "run_query",
    arguments: { sql: RESULT_SQL, summary: "Cases in California." },
  };
  const events = [
    { type: "start" },
    {
      type: "toolcall_start",
      contentIndex: 0,
      id: "call-1",
      toolName: "run_query",
    },
    { type: "toolcall_end", contentIndex: 0, toolCall },
    { type: "done", reason: "toolUse", usage },
  ];
  return events
    .map((event) => {
      return `data: ${JSON.stringify(event)}\n\n`;
    })
    .join("");
}

test.describe("agent results in the chat", () => {
  test("a question on a dashboard shows its result in the chat", async ({
    page,
    e2eWorkerDb,
  }) => {
    const proxyBodies: string[] = [];
    await page.addInitScript(() => {
      window.localStorage.setItem("avandar:data-agent", "on");
    });
    await page.route(
      "**/functions/v1/chat/*/agent/data-agent-v2/api/stream",
      async (route) => {
        proxyBodies.push(route.request().postData() ?? "");
        await route.fulfill({
          contentType: "text/event-stream",
          body: _runQueryStream(),
        });
      },
    );

    const admin = createSupabaseAdminClient();
    const createdDashboardIds: string[] = [];
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await page.goto(`/${e2eWorkerDb.workspaceSlug}/dashboards`);
      await page
        .getByRole("button", { name: "Create a dashboard" })
        .first()
        .click();
      await expect(page).toHaveURL(/\/dashboards\/edit\//, {
        timeout: LONG_WAIT,
      });
      const dashboardUrl = page.url();
      const dashboardId = parseDashboardIdFromEditorUrl(dashboardUrl);
      if (dashboardId) {
        createdDashboardIds.push(dashboardId);
      }

      const chatToggle = page.getByRole("button", { name: /^chat$/i });
      if (await chatToggle.isVisible()) {
        await chatToggle.click();
      }
      const composer = page
        .getByPlaceholder(/Ask me/i)
        .or(page.locator('[data-testid="composer-input"]'))
        .first();
      await composer.fill("How many cases in California?");
      await composer.press("Enter");

      const card = page.getByRole("group", {
        name: "How many cases in California?",
      });
      await expect(card.getByRole("link", { name: /^Open / })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      // The Open link shows while the result loads or after it fails, so
      // the result's own rows must show too.
      await expect(card.getByText("California", { exact: true })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(page.getByText("Cases in California.")).toBeVisible();
      expect(page.url()).toBe(dashboardUrl);
      expect(proxyBodies[0]).toContain("<current_page>");
      expect(proxyBodies[0]).toContain("Page: Dashboard");
      await page.screenshot({
        path: _buildScreenshotPath("agent-chat-result.png"),
      });

      await page.reload();
      if (await chatToggle.isVisible()) {
        await chatToggle.click();
      }
      await expect(card.getByRole("link", { name: /^Open / })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(card.getByText("California", { exact: true })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
