import { execFileSync } from "node:child_process";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

/**
 * The user mentions a dataset with `@` and attaches a dashboard from the
 * "Add context" picker, then sends. The model is mocked at the agent proxy,
 * so the test checks the browser's side: the proxy gets the attached and
 * mentioned blocks with names in place of ids, the sent message draws the
 * mention as a chip, and the tray and chip survive a reload.
 */

const RESULT_SQL = `SELECT 'California' AS "state", 42 AS "cases"`;

/** The dataset's first word, typed after `@` to find it. */
const DATASET_SEARCH_WORD = "Mentionable";

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

/**
 * Seeds an open dataset owned by the workspace owner, before the page
 * loads, so the `@` menu has something to find. It has no rows: the agent
 * only reads its name.
 */
async function _seedDataset(options: {
  admin: AvaSupabaseDBClient;
  workspaceId: string;
  name: string;
}): Promise<string> {
  const { admin, workspaceId, name } = options;
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (workspaceError || !workspace.owner_id) {
    throw new Error(
      `[e2e] workspace owner missing: ${workspaceError?.message}`,
    );
  }
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", workspace.owner_id)
    .single();
  if (profileError) {
    throw new Error(`[e2e] owner profile missing: ${profileError.message}`);
  }
  const { data: dataset, error: datasetError } = await admin
    .from("datasets")
    .insert({
      workspace_id: workspaceId,
      owner_id: workspace.owner_id,
      owner_profile_id: profile.id,
      name,
      source_type: "csv_file",
    })
    .select("id")
    .single();
  if (datasetError) {
    throw new Error(`[e2e] dataset insert failed: ${datasetError.message}`);
  }
  return dataset.id;
}

/**
 * The proxy body without the recap's `[View changed: ...]` lines. The body
 * is JSON, so each line ends at an escaped newline.
 */
function _removeViewChangeLines(body: string): string {
  return body.replace(/User: \[View changed:[^\]]*\]/g, "");
}

/**
 * Whether the message box is on screen. A closed chat panel keeps it in
 * the page, outside the viewport, so visibility alone does not tell.
 */
async function _isComposerOnScreen(page: Page): Promise<boolean> {
  const box = await page.getByLabel("Message", { exact: true }).boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) {
    return false;
  }
  return box.x >= 0 && box.x + box.width <= viewport.width;
}

/**
 * Opens the chat panel unless it is already open. The panel's open state
 * survives a reload, and the header's "Chat" button toggles it, so the
 * button is clicked only when the message box is off screen.
 */
async function _openChat(page: Page): Promise<void> {
  const chatToggle = page.getByRole("button", { name: /^chat$/i });
  const composer = page.getByLabel("Message", { exact: true });
  await expect(chatToggle).toBeVisible({ timeout: LONG_WAIT });
  await expect(composer).toBeAttached({ timeout: LONG_WAIT });
  if (!(await _isComposerOnScreen(page))) {
    await chatToggle.click();
  }
  await expect(composer).toBeInViewport();
}

/** Creates a dashboard through the UI and returns its id. */
async function _createDashboard(
  page: Page,
  workspaceSlug: string,
): Promise<string> {
  await page.goto(`/${workspaceSlug}/dashboards`);
  await page
    .getByRole("button", { name: "Create a dashboard" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboards\/edit\//, {
    timeout: LONG_WAIT,
  });
  const dashboardId = parseDashboardIdFromEditorUrl(page.url());
  if (!dashboardId) {
    throw new Error(`[e2e] no dashboard id in ${page.url()}`);
  }
  return dashboardId;
}

test.describe("agent context in the chat", () => {
  test("a mention and an attachment reach the agent by name", async ({
    page,
    e2eWorkerDb,
  }) => {
    const proxyBodies: string[] = [];
    await page.addInitScript(() => {
      window.localStorage.setItem("avandar:data-agent", "on");
    });
    await page.route(
      "**/functions/v1/chat/*/agent/data-agent-v3/api/stream",
      async (route) => {
        proxyBodies.push(route.request().postData() ?? "");
        await route.fulfill({
          contentType: "text/event-stream",
          body: _runQueryStream(),
        });
      },
    );

    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const createdDashboardIds: string[] = [];
    const datasetId = await _seedDataset({
      admin,
      workspaceId,
      name: `${DATASET_SEARCH_WORD} cases ${Date.now()}`,
    });
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      const dashboardId = await _createDashboard(
        page,
        e2eWorkerDb.workspaceSlug,
      );
      createdDashboardIds.push(dashboardId);
      await _openChat(page);

      // A label, not a role: the editing area is a combobox while the `@`
      // menu is open and a textbox otherwise.
      const composer = page.getByLabel("Message", { exact: true });
      await composer.click();
      await composer.pressSequentially(`Totals for @${DATASET_SEARCH_WORD}`);
      const datasetOption = page.getByRole("option", {
        name: new RegExp(DATASET_SEARCH_WORD),
      });
      await expect(datasetOption).toBeVisible({ timeout: MEDIUM_WAIT });
      await composer.press("Enter");
      const datasetChip = `[data-type="gadgetLink"][data-gadget-id="${datasetId}"]`;
      await expect(composer.locator(datasetChip)).toBeVisible();

      await page.getByRole("button", { name: "Add context" }).click();
      const pageGroup = page.getByRole("group", { name: "On this page" });
      await pageGroup.getByRole("option").first().click();
      const tray = page.getByRole("list", { name: "Attached to this chat" });
      const dashboardChip = `[data-gadget-id="${dashboardId}"]`;
      await expect(tray.locator(dashboardChip)).toBeVisible();

      await composer.press("Enter");
      await expect
        .poll(() => {
          return proxyBodies.length;
        })
        .toBeGreaterThan(0);
      const body = proxyBodies[0]!;
      expect(body).toContain("<attached>");
      expect(body).toContain("<mentioned>");
      expect(body).toContain('@\\"');
      expect(body).not.toContain("@{");
      expect(body).not.toContain(datasetId);
      // The recap of earlier messages still carries the chat's view change
      // events, whose route holds the open dashboard's id. Everything else
      // in the request must be free of it.
      expect(_removeViewChangeLines(body)).not.toContain(dashboardId);

      // In the composer the chip is a button; in a sent message, a link.
      const sentChip = page.locator(`a${datasetChip}`);
      await expect(sentChip).toBeVisible({ timeout: MEDIUM_WAIT });
      // The turn is saved once its result shows, so the reload finds it.
      await expect(page.getByText("Cases in California.")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await page.screenshot({
        path: _buildScreenshotPath("agent-chat-mentions.png"),
      });

      await page.reload();
      await _openChat(page);
      await expect(tray.locator(dashboardChip)).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(sentChip).toBeVisible({ timeout: MEDIUM_WAIT });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
      await deleteDatasetFixture({ admin, datasetId, workspaceId });
    }
  });
});
