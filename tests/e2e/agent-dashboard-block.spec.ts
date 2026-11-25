import { execFileSync } from "node:child_process";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { openAgentChat } from "./helpers/openAgentChat";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * The agent adds a chart to a dashboard the user names, from the Data
 * Explorer, through a card the user confirms. The model is mocked at the
 * agent proxy, so the test checks the browser's side: the name resolves on
 * the device, the chart's SQL runs in DuckDB-Wasm, the card waits for
 * Confirm, and the saved dashboard shows the block.
 */

const CHART_SQL = `SELECT 'California' AS "state", 42 AS "cases"`;

/** `.temp/<branch>/<file>`, with the branch kebab-cased. */
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

/** Pi `streamProxy` events for one add_dashboard_block call. */
function _addBlockStream(dashboardName: string): string {
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
    name: "add_dashboard_block",
    arguments: {
      dashboard: dashboardName,
      block: {
        kind: "DataViz",
        prompt: "Cases by state",
        sql: CHART_SQL,
        vizType: "bar",
      },
      summary: `A cases chart is ready to add to ${dashboardName}.`,
    },
  };
  const events = [
    { type: "start" },
    {
      type: "toolcall_start",
      contentIndex: 0,
      id: "call-1",
      toolName: "add_dashboard_block",
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

test.describe("agent dashboard blocks", () => {
  test("adds a chart to a named dashboard after the user confirms", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { primaryUser, workspaceSlug } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const dashboardName = `Agent target ${crypto.randomUUID().slice(0, 6)}`;
    const dashboardIds: string[] = [];
    await page.addInitScript(() => {
      window.localStorage.setItem("avandar:data-agent", "on");
    });
    await page.route(
      "**/functions/v1/chat/*/agent/data-agent-v6/api/stream",
      async (route) => {
        await route.fulfill({
          contentType: "text/event-stream",
          body: _addBlockStream(dashboardName),
        });
      },
    );
    try {
      dashboardIds.push(
        await seedDashboard({
          admin,
          workspaceId,
          ownerEmail: primaryUser.email,
          name: dashboardName,
        }),
      );
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/data-explorer`);
      await openAgentChat(page);
      const composer = page.getByLabel("Message", { exact: true });
      await composer.fill(`Add a chart of cases by state to ${dashboardName}`);
      await composer.press("Enter");

      const card = page.getByRole("group", { name: "Add to dashboard" });
      await expect(card.getByText(dashboardName)).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(card.getByText("California", { exact: true })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await page.screenshot({
        path: _buildScreenshotPath("agent-dashboard-card.png"),
      });
      await card.getByRole("button", { name: "Confirm" }).click();

      const openLink = card.getByRole("link", {
        name: `Open ${dashboardName}`,
      });
      await expect(openLink).toBeVisible({ timeout: MEDIUM_WAIT });
      expect(page.url()).toContain("/data-explorer");
      await openLink.click();
      await expect(page).toHaveURL(/\/dashboards\/edit\//, {
        timeout: LONG_WAIT,
      });
      // The chat card also shows "California", so the saved block is found
      // inside the editor's own frame, where only the dashboard draws.
      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(editorFrame.locator(".recharts-bar").first()).toBeVisible({
        timeout: LONG_WAIT,
      });
      await page.screenshot({
        path: _buildScreenshotPath("agent-dashboard-saved.png"),
      });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds });
    }
  });
});
