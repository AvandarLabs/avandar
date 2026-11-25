import { describe, expect, it } from "vitest";
import {
  CHAT_TITLE_PROMPT_ID,
  buildChatTitleMessages,
  isChatTitlePromptId,
  parseChatTitleReply,
} from "$/agent/chatTitle/chatTitlePrompt.ts";

describe("chatTitlePrompt", () => {
  it("serves chat-title-v1 and rejects any other id", () => {
    expect(isChatTitlePromptId(CHAT_TITLE_PROMPT_ID)).toBe(true);
    expect(isChatTitlePromptId("data-agent-v3")).toBe(false);
  });

  it("asks for a noun phrase in the given locale and includes the excerpt", () => {
    const messages = buildChatTitleMessages({
      excerpt: "user: How many cases?\nassistant: 42",
      locale: "es",
      placeholder: "Nuevo chat",
    });
    const system = messages[0]?.content ?? "";
    const user = messages[1]?.content ?? "";
    expect(system).toContain("short noun phrase");
    expect(system).toContain("placeholder exactly");
    expect(user).toContain("Locale: es");
    expect(user).toContain("Placeholder: Nuevo chat");
    expect(user).toContain("How many cases?");
  });

  it("rejects an empty reply, the placeholder, and keeps the model's words", () => {
    expect(parseChatTitleReply("  ", "New chat")).toBeUndefined();
    expect(parseChatTitleReply("New chat", "New chat")).toBeUndefined();
    expect(parseChatTitleReply('"Case counts"', "New chat")).toBe(
      "Case counts",
    );
  });
});
