import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";

import { useCallback, useSyncExternalStore } from "react";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";

function _subscribeToLaidOutTarget(
  anchor: NuxAnchor | undefined,
  onStoreChange: () => void,
): () => void {
  if (anchor === undefined) {
    return () => {
      return;
    };
  }
  let lastTarget = NuxAnchors.queryLaidOut(anchor);
  const notifyIfChanged = (): void => {
    const nextTarget = NuxAnchors.queryLaidOut(anchor);
    if (nextTarget === lastTarget) {
      return;
    }
    lastTarget = nextTarget;
    onStoreChange();
  };
  const mutationObserver = new MutationObserver(notifyIfChanged);
  mutationObserver.observe(document.body, {
    attributeFilter: ["data-nux"],
    attributes: true,
    childList: true,
    subtree: true,
  });
  return () => {
    mutationObserver.disconnect();
  };
}

/**
 * The current step's spotlight node once it has a layout box off the
 * viewport origin.
 *
 * Subscribes to DOM mutations so replacing that node (Puck remounts the
 * dashboard header) re-renders the tour instead of measuring a detached
 * copy at 0,0.
 */
export function useNuxLaidOutTarget(
  anchor: NuxAnchor | undefined,
): HTMLElement | null {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return _subscribeToLaidOutTarget(anchor, onStoreChange);
    },
    [anchor],
  );
  const getLaidOutTarget = useCallback((): HTMLElement | null => {
    if (anchor === undefined) {
      return null;
    }
    return NuxAnchors.queryLaidOut(anchor);
  }, [anchor]);
  return useSyncExternalStore(subscribe, getLaidOutTarget, getLaidOutTarget);
}
