import type { Page } from "@playwright/test";

import { propEq } from "@avandar/utils";

import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  getChatComposerInput,
  openChatPanelIfClosed,
} from "./helpers/chatPanelFlow";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * E2E coverage for the chat-interactive-workflows feature
 * (`docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`).
 *
 * These tests mock the OpenRouter call routed through the supabase
 * edge function: every "chat/:workspaceId/messages" request is
 * intercepted and replied to from the test instead of going to the
 * real LLM. We do this for two reasons:
 *
 *   1. Money / determinism: running these against the real model
 *      would cost a fraction of a cent per turn but introduce
 *      flakiness via temperature.
 *   2. Coverage: by controlling the response we can force each
 *      `clarify` response shape to appear whenever we want.
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
      | {
          kind: "discovery";
          query: string;
          column: string;
          multi: boolean;
          candidateValues: string[];
        };
    turnNumber: 1 | 2 | 3;
  };
};

type OpenChatAndSendMessageParameters = {
  page: Page;
  email: string;
  password: string;
  workspaceSlug: string;
  message: string;
};

async function mountMockChat(args: {
  page: import("@playwright/test").Page;
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

function _getLastUserMessage(body: unknown): string {
  const messages = (
    body as { messages?: Array<{ role: string; content: string }> }
  ).messages;
  return (
    [...(messages ?? [])].reverse().find(propEq("role", "user"))?.content ?? ""
  );
}

async function _openChatAndSendMessage(
  options: Readonly<OpenChatAndSendMessageParameters>,
): Promise<void> {
  const { page, email, password, workspaceSlug, message } = options;
  await signInWithEmailPassword(page, { email, password, workspaceSlug });
  await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}/data-explorer`), {
    timeout: MEDIUM_WAIT,
  });
  await dismissBlockingOverlays(page);
  await openChatPanelIfClosed(page);
  const composer = getChatComposerInput(page);
  await composer.fill(message);
  await composer.press("Enter");
}

async function _selectLastScrollableClarificationOption(
  page: Page,
): Promise<void> {
  const clarificationBody = page.getByTestId("clarification-card-body");
  await expect(clarificationBody).toBeVisible({ timeout: MEDIUM_WAIT });
  await expect(
    page.getByRole("radio", { name: "State 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^confirm$/i })).toBeVisible();
  const scrollMetrics = await clarificationBody.evaluate((element) => {
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight,
  );
  await clarificationBody.hover();
  await page.mouse.wheel(0, scrollMetrics.scrollHeight);
  const lastOption = page.getByRole("radio", {
    name: "State 50",
    exact: true,
  });
  await expect(lastOption).toBeInViewport();
  await lastOption.click();
  const confirmButton = page.getByRole("button", { name: /^confirm$/i });
  await expect(confirmButton).toBeInViewport();
  await expect(confirmButton).toBeEnabled({ timeout: SHORT_WAIT });
  await confirmButton.click();
}

test.describe("chat interactive workflows", () => {
  test("fixed-options clarification appears inline and the answer is sent back", async ({
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
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`, {
      waitUntil: "domcontentloaded",
    });
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

  test("fixed-options clarification accepts a custom Something else answer", async ({
    page,
    e2eWorkerDb,
  }) => {
    let lastUserMessage = "";

    await mountMockChat({
      page,
      responder: (turnIndex, body) => {
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
        const messages = (
          body as { messages?: Array<{ role: string; content: string }> }
        ).messages;
        const lastUser = [...(messages ?? [])].reverse().find((m) => {
          return m.role === "user";
        });
        lastUserMessage = lastUser?.content ?? "";
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
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`, {
      waitUntil: "domcontentloaded",
    });
    await dismissBlockingOverlays(page);

    await openChatPanelIfClosed(page);

    const composer = getChatComposerInput(page);
    await composer.fill("show me cases by region");
    await composer.press("Enter");

    await expect(
      page.getByText("Which region do you mean?").first(),
    ).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page
      .getByRole("radio", { name: /something else/i })
      .evaluate((node) => {
        (node as { click: () => void }).click();
      });
    const customAnswerInput = page.getByLabel("Custom clarification answer");
    await expect(customAnswerInput).toBeVisible({ timeout: SHORT_WAIT });
    await customAnswerInput.fill("Western corridor");
    await expect(customAnswerInput).toHaveValue("Western corridor");

    const confirmButton = page.getByRole("button", { name: /^confirm$/i });
    await expect(confirmButton).toBeEnabled({ timeout: SHORT_WAIT });
    await confirmButton.evaluate((node) => {
      (node as { click: () => void }).click();
    });

    await expect(page.getByText("Here is the SQL.")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    expect(lastUserMessage).toContain(
      "[Clarification answer: (custom answer: Western corridor)]",
    );
  });

  test("discovery auto-resolves one prompt-derived candidate locally", async ({
    page,
    e2eWorkerDb,
  }) => {
    let lastUserMessage = "";
    await mountMockChat({
      page,
      responder: (turnIndex, body) => {
        if (turnIndex === 0) {
          return {
            assistantText: "Checking the stored state value.",
            clarification: {
              question: "Which stored state represents California?",
              responseShape: {
                kind: "discovery",
                query:
                  "SELECT state FROM (VALUES ('Alabama'), ('California'), ('Nevada')) AS states(state)",
                column: "state",
                multi: false,
                candidateValues: ["California", "CA"],
              },
              turnNumber: 1,
            },
          };
        }
        lastUserMessage = _getLastUserMessage(body);
        return { assistantText: "California matched." };
      },
    });

    await _openChatAndSendMessage({
      page,
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
      message: "how many deaths did california have in 2022?",
    });

    await expect(page.getByText("California matched.")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(
      page.getByText("Which stored state represents California?", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("[Clarification answer: California]", { exact: true }),
    ).toHaveCount(0);
    expect(lastUserMessage).toContain("[Clarification answer: California]");
  });

  test("failed discovery can request a different lookup", async ({
    page,
    e2eWorkerDb,
  }) => {
    let lastUserMessage = "";
    await mountMockChat({
      page,
      responder: (turnIndex, body) => {
        if (turnIndex === 0) {
          return {
            assistantText: "Checking available values.",
            clarification: {
              question: "Which state should I use?",
              responseShape: {
                kind: "discovery",
                query: 'SELECT "missing" FROM "missing_table"',
                column: "state",
                multi: false,
                candidateValues: ["California", "CA"],
              },
              turnNumber: 1,
            },
          };
        }
        lastUserMessage = _getLastUserMessage(body);
        return { assistantText: "Different lookup ready." };
      },
    });

    await _openChatAndSendMessage({
      page,
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
      message: "show deaths for california",
    });
    await page.getByRole("button", { name: "Try a different lookup" }).click();

    await expect(page.getByText("Different lookup ready.")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    expect(lastUserMessage).toContain("different column or lookup query");
  });

  test("large fixed-options clarification keeps its answer controls reachable", async ({
    page,
    e2eWorkerDb,
  }) => {
    const options = Array.from({ length: 50 }, (_, index) => {
      return `State ${index + 1}`;
    });

    await mountMockChat({
      page,
      responder: (turnIndex) => {
        return turnIndex > 0
          ? { assistantText: "State selected." }
          : {
              assistantText: "Which state do you mean?",
              clarification: {
                question: "Which state do you mean?",
                responseShape: {
                  kind: "fixed_options",
                  options,
                  multi: false,
                },
                turnNumber: 1,
              },
            };
      },
    });

    await _openChatAndSendMessage({
      page,
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
      message: "show me records by state",
    });
    await _selectLastScrollableClarificationOption(page);
    await expect(page.getByText("State selected.")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
  });
});
