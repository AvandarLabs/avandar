/**
 * Context-window overflow must surface as assistant text, not an uncaught
 * throw.
 */
import { describe, expect, it } from "vitest";

import {
  isOfflineContextWindowOverflow,
  offlineChatOverflowAssistantText,
} from "@/components/ChatPanel/useAvandarChatRuntime/offlineChatOverflow";

describe("isOfflineContextWindowOverflow", () => {
  it("detects web-llm ContextWindowSizeExceededError", () => {
    const error = new Error("Prompt is too long");
    error.name = "ContextWindowSizeExceededError";
    expect(isOfflineContextWindowOverflow(error)).toBe(true);
    expect(isOfflineContextWindowOverflow(new Error("network down"))).toBe(
      false,
    );
  });
});

describe("offlineChatOverflowAssistantText", () => {
  it("returns copy for overflow and undefined otherwise", () => {
    const overflow = new Error("too long");
    overflow.name = "ContextWindowSizeExceededError";
    expect(offlineChatOverflowAssistantText(overflow, "Window too small")).toBe(
      "Window too small",
    );
    expect(
      offlineChatOverflowAssistantText(new Error("boom"), "Window too small"),
    ).toBeUndefined();
  });
});
