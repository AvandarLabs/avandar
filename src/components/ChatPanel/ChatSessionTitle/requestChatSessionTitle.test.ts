import { describe, expect, it, vi } from "vitest";
import { requestChatSessionTitle } from "./requestChatSessionTitle";

describe("requestChatSessionTitle", () => {
  it("stores a hosted title without adding it to the data turn", async () => {
    const setSessionTitle = vi.fn();
    const post = vi.fn().mockResolvedValue({ title: "Case counts" });

    await requestChatSessionTitle({
      sessionId: "s1",
      kind: "data",
      workspaceId: "ws-1",
      excerpt: "user: How many cases?\nassistant: 42",
      locale: "en",
      placeholder: "New chat",
      isOffline: false,
      post,
      completeOffline: vi.fn(),
      setSessionTitle,
    });

    expect(post).toHaveBeenCalledWith({
      route: "chat/:workspaceId/title/:promptId",
      pathParams: { workspaceId: "ws-1", promptId: "chat-title-v1" },
      body: {
        excerpt: "user: How many cases?\nassistant: 42",
        locale: "en",
        placeholder: "New chat",
      },
    });
    expect(setSessionTitle).toHaveBeenCalledWith("s1", "Case counts");
  });

  it("leaves the placeholder when the title route fails", async () => {
    const setSessionTitle = vi.fn();

    await requestChatSessionTitle({
      sessionId: "s1",
      kind: "data",
      workspaceId: "ws-1",
      excerpt: "user: Hi\nassistant: Hello",
      locale: "en",
      placeholder: "New chat",
      isOffline: false,
      post: vi.fn().mockRejectedValue(new Error("down")),
      completeOffline: vi.fn(),
      setSessionTitle,
    });

    expect(setSessionTitle).not.toHaveBeenCalled();
  });

  it("asks the offline model without calling the route", async () => {
    const post = vi.fn();
    const completeOffline = vi.fn().mockResolvedValue({ text: "Conteos" });
    const setSessionTitle = vi.fn();

    await requestChatSessionTitle({
      sessionId: "s1",
      kind: "data",
      workspaceId: "ws-1",
      excerpt:
        "user: Hi\nassistant: [An answer from the offline model, not shown]",
      locale: "es",
      placeholder: "Nuevo chat",
      isOffline: true,
      post,
      completeOffline,
      setSessionTitle,
    });

    expect(post).not.toHaveBeenCalled();
    expect(completeOffline).toHaveBeenCalledOnce();
    expect(setSessionTitle).toHaveBeenCalledWith("s1", "Conteos");
  });
});
