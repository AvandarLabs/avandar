import { describe, expect, it } from "vitest";
import { makeLikeFromThreadMessage } from "@/components/ChatPanel/useChatViewTranscript/threadMessageHelpers";
import { OfflineAnswerMessage } from "./OfflineAnswerMessage";

describe("OfflineAnswerMessage", () => {
  it("marks a run result and keeps its content and other metadata", () => {
    const marked = OfflineAnswerMessage.mark({
      content: [{ type: "text", text: "Two rows." }],
      metadata: { custom: { other: 1 } },
    });

    expect(marked.content).toEqual([{ type: "text", text: "Two rows." }]);
    expect(marked.metadata?.custom).toEqual({
      other: 1,
      isOfflineAnswer: true,
    });
    expect(OfflineAnswerMessage.isOfflineAnswer(marked.metadata)).toBe(true);
  });

  it("does not mark a message without the flag", () => {
    expect(OfflineAnswerMessage.isOfflineAnswer(undefined)).toBe(false);
    expect(OfflineAnswerMessage.isOfflineAnswer({ custom: {} })).toBe(false);
  });

  it("keeps the mark when the thread is stored", () => {
    const stored = makeLikeFromThreadMessage({
      id: "m1",
      role: "assistant",
      content: [{ type: "text", text: "Two rows." }],
      metadata: OfflineAnswerMessage.mark({}).metadata,
    });

    expect(
      OfflineAnswerMessage.isOfflineAnswer(
        JSON.parse(JSON.stringify(stored)).metadata,
      ),
    ).toBe(true);
  });
});
