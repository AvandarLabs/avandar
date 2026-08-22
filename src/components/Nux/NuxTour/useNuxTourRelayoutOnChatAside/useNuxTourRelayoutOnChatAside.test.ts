import { afterEach, describe, expect, it, vi } from "vitest";
import { useNuxTourRelayoutOnChatAside } from "@/components/Nux/NuxTour/useNuxTourRelayoutOnChatAside/useNuxTourRelayoutOnChatAside";
import { CHAT_PANEL_ASIDE_SELECTOR } from "@/config/AppShellLayout.constants";
import { act, renderHook } from "@/test-utils";

function _createChatAside(): HTMLElement {
  const aside = document.createElement("aside");
  const className = CHAT_PANEL_ASIDE_SELECTOR.replace(".", "");
  aside.className = className;
  document.body.append(aside);
  return aside;
}

function _dispatchTransformTransition(
  aside: HTMLElement,
  type: "transitionrun" | "transitionend",
): void {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "propertyName", { value: "transform" });
  aside.dispatchEvent(event);
}

describe("useNuxTourRelayoutOnChatAside", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("dispatches a window resize when the chat aside finishes sliding", () => {
    const aside = _createChatAside();
    const onResize = vi.fn();
    window.addEventListener("resize", onResize);

    renderHook(() => {
      useNuxTourRelayoutOnChatAside();
    });
    onResize.mockClear();

    act(() => {
      _dispatchTransformTransition(aside, "transitionend");
    });

    expect(onResize).toHaveBeenCalled();
    window.removeEventListener("resize", onResize);
  });

  it("dispatches a window resize when the chat aside starts sliding", () => {
    const aside = _createChatAside();
    const onResize = vi.fn();
    window.addEventListener("resize", onResize);

    renderHook(() => {
      useNuxTourRelayoutOnChatAside();
    });
    onResize.mockClear();

    act(() => {
      _dispatchTransformTransition(aside, "transitionrun");
    });

    expect(onResize).toHaveBeenCalled();
    window.removeEventListener("resize", onResize);
  });
});
