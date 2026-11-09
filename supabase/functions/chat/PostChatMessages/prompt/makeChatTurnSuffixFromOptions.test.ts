/**
 * Volatile turn suffix vs frozen unified system prefix.
 */
import { unifiedSystemPrefix } from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";
import { getLastUserPromptFromMessages } from "@sbfn/chat/PostChatMessages/prompt/getLastUserPromptFromMessages.ts";
import { makeChatTurnSuffixFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatTurnSuffixFromOptions.ts";
import { describe, expect, it } from "vitest";
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";

describe("makeChatTurnSuffixFromOptions", () => {
  it("puts live SQL and errors in the suffix, not the frozen prefix", () => {
    expect(unifiedSystemPrefix).not.toContain("Previous SQL");
    expect(unifiedSystemPrefix.toLowerCase()).not.toContain(
      "currently in the data explorer",
    );
    expect(unifiedSystemPrefix).toContain('FROM "t0"');
    expect(unifiedSystemPrefix).toContain(
      "A question about the schema (which columns a dataset has",
    );
    expect(unifiedSystemPrefix).not.toContain("dataset ids");
    const suffix = makeChatTurnSuffixFromOptions({
      context: ChatPageContext.createDataExplorerViewContext({
        lastSql: "select 1",
        lastError: "boom",
        lastResultColumns: [{ name: "n", dataType: "bigint" }],
      }),
      lastUserPrompt: "fix it",
    });
    expect(suffix).toContain("select 1");
    expect(suffix).toContain("boom");
    expect(suffix).toContain("n (bigint)");
  });

  it("does not use a trailing view-change as lastUserPrompt for spatial suffix docs", () => {
    const lastUserPrompt = getLastUserPromptFromMessages([
      { role: "user", content: "count points near the warehouse" },
      {
        role: "user",
        content:
          "[View changed: app=data-explorer; route=/x; dataset=none; dashboard=none]",
      },
    ]);
    expect(lastUserPrompt).toBe("count points near the warehouse");
    const suffix = makeChatTurnSuffixFromOptions({
      context: ChatPageContext.createDataExplorerViewContext({}),
      lastUserPrompt,
    });
    expect(suffix).toContain("Reference documentation");
  });

  it("tells the model today's date so relative periods are not guessed", () => {
    const suffix = makeChatTurnSuffixFromOptions({
      context: ChatPageContext.createDataExplorerViewContext({}),
      lastUserPrompt: "covid deaths last year",
      today: new Date("2026-11-06T15:00:00Z"),
    });
    expect(suffix).toContain("Today's date: 2026-11-06");
  });

  it("marks the explorer's SQL as possibly older than this conversation", () => {
    const suffix = makeChatTurnSuffixFromOptions({
      context: ChatPageContext.createDataExplorerViewContext({
        lastSql: "select 1",
        lastError: "boom",
      }),
      lastUserPrompt: "how many cases in Texas",
    });
    expect(suffix).toMatch(
      /may come from before this conversation[\s\S]*select 1/,
    );
    expect(suffix).toMatch(/last run of that SQL failed[\s\S]*boom/i);
  });
});
