/** Behavioral tests for the chat panel header New chat control. */
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";

import { ChatPanelHeader } from "./ChatPanelHeader";

describe("ChatPanelHeader", () => {
  it("invokes onNewChat from the header control", async () => {
    const onNewChat = vi.fn();
    const onClose = vi.fn();
    render(<ChatPanelHeader onNewChatClick={onNewChat} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
