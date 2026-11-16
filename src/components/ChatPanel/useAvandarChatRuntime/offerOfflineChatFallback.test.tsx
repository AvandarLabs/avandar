import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it, vi } from "vitest";
import { offerOfflineChatFallback } from "@/components/ChatPanel/useAvandarChatRuntime/offerOfflineChatFallback";
import { fireEvent, render, screen } from "@/test-utils";
import type { ReactElement } from "react";

const COPY = {
  title: "Chat request failed",
  message: "Answer offline instead?",
  action: "Answer offline",
};

function _lastNotification(): {
  message: ReactElement;
  onClose: () => void;
} {
  const show = vi.mocked(notifications.show);
  return show.mock.calls.at(-1)![0] as never;
}

describe("offerOfflineChatFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves true when the user picks the offline action", async () => {
    vi.spyOn(notifications, "show").mockReturnValue("offline-chat-fallback");
    vi.spyOn(notifications, "hide").mockReturnValue("offline-chat-fallback");
    const offer = offerOfflineChatFallback(COPY);
    render(_lastNotification().message);

    fireEvent.click(screen.getByRole("button", { name: COPY.action }));

    await expect(offer).resolves.toBe(true);
    expect(notifications.hide).toHaveBeenCalledWith("offline-chat-fallback");
  });

  it("resolves false when the user closes the notification", async () => {
    vi.spyOn(notifications, "show").mockReturnValue("offline-chat-fallback");
    const offer = offerOfflineChatFallback(COPY);

    _lastNotification().onClose();

    await expect(offer).resolves.toBe(false);
  });
});
