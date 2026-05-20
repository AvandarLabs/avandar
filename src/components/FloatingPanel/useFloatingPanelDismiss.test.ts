import { describe, expect, it } from "vitest";
import { isFloatingPanelTypingTarget } from "./isFloatingPanelTypingTarget";
import { shouldAutoFocusFloatingPanelOnOpen } from "./shouldAutoFocusFloatingPanelOnOpen";

describe("useFloatingPanelDismiss helpers", () => {
  it("isFloatingPanelTypingTarget detects form fields", () => {
    expect(isFloatingPanelTypingTarget(document.createElement("input"))).toBe(
      true,
    );
    expect(isFloatingPanelTypingTarget(document.createElement("button"))).toBe(
      false,
    );
  });

  it("shouldAutoFocusFloatingPanelOnOpen skips external typing targets", () => {
    const panel = document.createElement("div");
    const input = document.createElement("input");
    document.body.append(panel, input);
    input.focus();

    expect(shouldAutoFocusFloatingPanelOnOpen(panel)).toBe(false);

    panel.remove();
    input.remove();
  });
});
