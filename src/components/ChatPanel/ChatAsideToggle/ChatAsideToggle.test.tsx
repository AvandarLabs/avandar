/** Behavioral tests for the toolbar Chat toggle. */
import { describe, expect, it } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { fireEvent, render, screen } from "@/test-utils";
import { ChatAsideToggle } from "./ChatAsideToggle";

describe("ChatAsideToggle", () => {
  it("shows a Chat label so the collapsed control is recognizable", () => {
    render(
      <ChatPanelStateManager.Provider>
        <ChatAsideToggle />
      </ChatPanelStateManager.Provider>,
    );

    const button = screen.getByRole("button", { name: "Chat" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
