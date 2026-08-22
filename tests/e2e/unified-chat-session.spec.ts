import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  getChatComposerInput,
  getNewChatButton,
  openChatPanelIfClosed,
} from "./helpers/chatPanelFlow";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * E2E coverage for unified chat sessions
 * (docs/superpowers/specs/2026-08-17-unified-chat-sessions-design.md).
 *
 * Mocks the chat edge function the same way as chat-interactive-workflows:
 * every chat messages POST is fulfilled from the test so the thread content
 * is deterministic without calling OpenRouter.
 */

type ChatResponse = {
  assistantText: string;
};

async function mountMockChat(args: {
  page: Page;
  responder: (turnIndex: number, body: unknown) => ChatResponse;
}): Promise<void> {
  const { page, responder } = args;
  let turnIndex = 0;

  await page.route("**/functions/v1/chat/*/session-secret", async (route) => {
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
  });

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

async function signInAndOpenDataExplorerChat(
  page: Page,
  e2eWorkerDb: {
    workspaceSlug: string;
    primaryUser: { email: string; password: string };
  },
): Promise<void> {
  await signInWithEmailPassword(page, {
    email: e2eWorkerDb.primaryUser.email,
    password: e2eWorkerDb.primaryUser.password,
    workspaceSlug: e2eWorkerDb.workspaceSlug,
  });
  await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`, {
    waitUntil: "domcontentloaded",
  });
  await dismissBlockingOverlays(page);
  await openChatPanelIfClosed(page);
}

async function sendChatMessage(page: Page, message: string): Promise<void> {
  const composer = getChatComposerInput(page);
  await composer.fill(message);
  await composer.press("Enter");
}

test.describe("unified chat session", () => {
  test("keeps one thread across Data Explorer and dashboard edit", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const dashboardIds: string[] = [];

    try {
      const dashboardId = await seedDashboard({
        admin,
        workspaceId,
        ownerEmail: e2eWorkerDb.primaryUser.email,
        name: "E2E unified chat dashboard",
      });
      dashboardIds.push(dashboardId);

      await mountMockChat({
        page,
        responder: (turnIndex) => {
          return {
            assistantText: turnIndex === 0 ? "From explorer" : "From dashboard",
          };
        },
      });

      await signInAndOpenDataExplorerChat(page, e2eWorkerDb);
      await sendChatMessage(page, "explorer question");
      await expect(page.getByText("From explorer")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      await page.getByRole("link", { name: "Dashboards", exact: true }).click();
      await page
        .locator(".mantine-Card-root")
        .filter({ hasText: "E2E unified chat dashboard" })
        .click();
      await expect(page).toHaveURL(
        new RegExp(
          `/${e2eWorkerDb.workspaceSlug}/dashboards/edit/${dashboardId}`,
        ),
        { timeout: MEDIUM_WAIT },
      );
      await openChatPanelIfClosed(page);
      await sendChatMessage(page, "dashboard question");

      await expect(page.getByText("From explorer")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(page.getByText("From dashboard")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(page.getByText(/View changed:/)).toHaveCount(0);
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds });
    }
  });

  test("New chat clears the thread and shows the empty state", async ({
    page,
    e2eWorkerDb,
  }) => {
    await mountMockChat({
      page,
      responder: () => {
        return { assistantText: "From explorer" };
      },
    });

    await signInAndOpenDataExplorerChat(page, e2eWorkerDb);
    await sendChatMessage(page, "explorer question");
    await expect(page.getByText("From explorer")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await getNewChatButton(page).click();

    await expect(page.getByText("From explorer")).toHaveCount(0);
    await expect(getChatComposerInput(page)).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(getChatComposerInput(page)).toHaveValue("");
  });

  test("reload restores the committed thread", async ({
    page,
    e2eWorkerDb,
  }) => {
    await mountMockChat({
      page,
      responder: () => {
        return { assistantText: "From explorer" };
      },
    });

    await signInAndOpenDataExplorerChat(page, e2eWorkerDb);
    await sendChatMessage(page, "explorer question");
    await expect(page.getByText("From explorer")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissBlockingOverlays(page);
    await openChatPanelIfClosed(page);

    await expect(page.getByText("From explorer")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
  });

  test("Data Manager disables the composer but keeps the thread", async ({
    page,
    e2eWorkerDb,
  }) => {
    await mountMockChat({
      page,
      responder: () => {
        return { assistantText: "From explorer" };
      },
    });

    await signInAndOpenDataExplorerChat(page, e2eWorkerDb);
    await sendChatMessage(page, "explorer question");
    await expect(page.getByText("From explorer")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // Keep the aside open across client-side navigation; Data Manager uses a
    // different composer placeholder, so openChatPanelIfClosed cannot find it.
    await page.getByRole("link", { name: "Data Sources", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${e2eWorkerDb.workspaceSlug}/data-manager`),
      { timeout: MEDIUM_WAIT },
    );

    const disabledComposer = page.getByPlaceholder(
      /chat is enabled in data explorer and dashboards/i,
    );
    await expect(disabledComposer).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(disabledComposer).toBeDisabled();
    await expect(page.getByText("From explorer")).toBeVisible();
    await expect(getNewChatButton(page)).toBeEnabled();
  });
});
