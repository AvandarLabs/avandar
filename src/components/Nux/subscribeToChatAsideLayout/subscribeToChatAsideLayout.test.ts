import { afterEach, describe, expect, it, vi } from "vitest";

import { subscribeToChatAsideLayout } from "@/components/Nux/subscribeToChatAsideLayout/subscribeToChatAsideLayout";
import { CHAT_PANEL_ASIDE_SELECTOR } from "@/config/AppShellLayout.constants";

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

describe("subscribeToChatAsideLayout", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("notifies once when there is no chat aside", () => {
    const onLayoutChange = vi.fn();
    const stop = subscribeToChatAsideLayout(onLayoutChange);
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it("notifies when the aside finishes a transform slide", () => {
    const aside = _createChatAside();
    const onLayoutChange = vi.fn();
    const stop = subscribeToChatAsideLayout(onLayoutChange);
    onLayoutChange.mockClear();

    _dispatchTransformTransition(aside, "transitionend");
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it("notifies once at the start of a slide when ticks are off", () => {
    const aside = _createChatAside();
    const onLayoutChange = vi.fn();
    const stop = subscribeToChatAsideLayout(onLayoutChange, {
      tickWhileSliding: false,
    });
    onLayoutChange.mockClear();

    _dispatchTransformTransition(aside, "transitionrun");
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it("ignores transitions that are not the aside transform", () => {
    const aside = _createChatAside();
    const onLayoutChange = vi.fn();
    const stop = subscribeToChatAsideLayout(onLayoutChange);
    onLayoutChange.mockClear();

    const event = new Event("transitionend", { bubbles: true });
    Object.defineProperty(event, "propertyName", { value: "opacity" });
    aside.dispatchEvent(event);
    expect(onLayoutChange).not.toHaveBeenCalled();
    stop();
  });

  it("stops notifying after unsubscribe", () => {
    const aside = _createChatAside();
    const onLayoutChange = vi.fn();
    const stop = subscribeToChatAsideLayout(onLayoutChange);
    stop();
    onLayoutChange.mockClear();

    _dispatchTransformTransition(aside, "transitionend");
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});
