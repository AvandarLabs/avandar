import { describe, expect, it } from "vitest";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { isChatThreadVisiblyEmpty } from "./isChatThreadVisiblyEmpty";

describe("isChatThreadVisiblyEmpty", () => {
  it("treats a thread with no messages as empty", () => {
    expect(isChatThreadVisiblyEmpty([])).toBe(true);
  });

  it("treats a thread holding only hidden view events as empty", () => {
    expect(
      isChatThreadVisiblyEmpty([
        {
          content: [{ type: "text", text: "Viewing Data Explorer" }],
          metadata: ChatViewEvent.metadata,
        },
      ]),
    ).toBe(true);
  });

  it("is not empty once the user has sent a visible message", () => {
    expect(
      isChatThreadVisiblyEmpty([
        {
          content: [{ type: "text", text: "Viewing Data Explorer" }],
          metadata: ChatViewEvent.metadata,
        },
        { content: [{ type: "text", text: "How many rows are there?" }] },
      ]),
    ).toBe(false);
  });
});
