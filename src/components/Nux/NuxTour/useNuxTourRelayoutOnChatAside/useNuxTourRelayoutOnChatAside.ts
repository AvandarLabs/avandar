import { useLayoutEffect } from "react";
import { subscribeToChatAsideLayout } from "@/components/Nux/subscribeToChatAsideLayout/subscribeToChatAsideLayout";

/**
 * Asks Joyride to remeasure the spotlight when the chat aside slides.
 *
 * Joyride only listens for window resize, scroll, and the target's own
 * `ResizeObserver`. Opening chat moves the Save button via a CSS transform
 * on the aside, so none of those fire and the hole stays at the old
 * coordinates. A window `resize` at slide start and end is the signal
 * Joyride already handles.
 */
export function useNuxTourRelayoutOnChatAside(): void {
  useLayoutEffect(function relayoutTourWhenChatAsideMoves() {
    return subscribeToChatAsideLayout(
      () => {
        window.dispatchEvent(new Event("resize"));
      },
      { tickWhileSliding: false },
    );
  }, []);
}
