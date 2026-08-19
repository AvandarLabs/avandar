/**
 * Always-on OpenRouter tool catalog for unified chat sessions.
 */
import { prop } from "@avandar/utils";
import { makeChatToolConfigFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts";
import { describe, expect, it } from "vitest";

describe("makeChatToolConfigFromOptions", () => {
  it("always advertises clarify, generateSql, and addDashboardBlock in that order", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
    });
    const tools = config.tools as Array<{ function: { name: string } }>;
    expect(tools.map(prop("function.name"))).toEqual([
      "clarify",
      "generateSql",
      "addDashboardBlock",
    ]);
  });
});
