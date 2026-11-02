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
});
