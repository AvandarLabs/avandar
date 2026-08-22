/** Behavioral tests for the expanded-chat canvas overlay. */
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";

import { ChatComposerOverlay } from "./ChatComposerOverlay";

describe("ChatComposerOverlay", () => {
  it("docks the expanded chat when the canvas overlay is clicked", () => {
    const onDismiss = vi.fn();
    render(<ChatComposerOverlay onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "Dock chat panel" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
