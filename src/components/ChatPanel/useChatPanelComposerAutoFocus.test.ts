import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatPanelComposerAutoFocus } from "./useChatPanelComposerAutoFocus";

function createAsideWithTransition(): HTMLElement {
  const aside = document.createElement("aside");
  aside.style.transition = "transform 200ms ease";
  document.body.append(aside);
  return aside;
}

function dispatchAsideTransformTransitionEnd(aside: HTMLElement): void {
  const event = new Event("transitionend", { bubbles: true });
  Object.defineProperty(event, "propertyName", { value: "transform" });
  aside.dispatchEvent(event);
}

describe("useChatPanelComposerAutoFocus", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("does not focus on initial mount when the panel is already open", () => {
    const focus = vi.fn();
    const panel = document.createElement("div");
    const input = document.createElement("textarea");
    input.focus = focus;
    panel.append(input);
    document.body.append(panel);

    renderHook(() => {
      const panelRef = useRef(panel);
      const composerInputRef = useRef(input);
      useChatPanelComposerAutoFocus({
        isOpen: true,
        panelRef,
        composerInputRef,
      });
    });

    expect(focus).not.toHaveBeenCalled();
  });

  it("focuses the composer after the AppShell aside transform transition ends", () => {
    const focus = vi.fn();
    const aside = createAsideWithTransition();
    const panel = document.createElement("div");
    const input = document.createElement("textarea");
    input.focus = focus;
    aside.append(panel);
    panel.append(input);

    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const panelRef = useRef(panel);
        const composerInputRef = useRef(input);
        useChatPanelComposerAutoFocus({
          isOpen,
          panelRef,
          composerInputRef,
        });
      },
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });

    act(() => {
      dispatchAsideTransformTransitionEnd(aside);
    });

    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("skips focus when the user is typing in an input outside the panel", () => {
    const focus = vi.fn();
    const aside = createAsideWithTransition();
    const panel = document.createElement("div");
    const input = document.createElement("textarea");
    input.focus = focus;
    const externalInput = document.createElement("input");
    aside.append(panel);
    panel.append(input);
    document.body.append(externalInput);
    externalInput.focus();

    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const panelRef = useRef(panel);
        const composerInputRef = useRef(input);
        useChatPanelComposerAutoFocus({
          isOpen,
          panelRef,
          composerInputRef,
        });
      },
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });

    act(() => {
      dispatchAsideTransformTransitionEnd(aside);
    });

    expect(focus).not.toHaveBeenCalled();
  });
});
