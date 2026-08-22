import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";

import { useSyncExternalStore } from "react";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";

function _isAnchorInDocument(anchor: NuxAnchor | undefined): boolean {
  if (anchor === undefined) {
    return true;
  }
  return document.querySelector(NuxAnchors.selector(anchor)) !== null;
}

function _subscribeToAnchorPresence(
  anchor: NuxAnchor | undefined,
  onStoreChange: () => void,
): () => void {
  if (anchor === undefined) {
    return () => {
      return;
    };
  }
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    attributeFilter: ["data-nux"],
    attributes: true,
    childList: true,
    subtree: true,
  });
  return () => {
    observer.disconnect();
  };
}

/**
 * Whether the given tutorial anchor is currently in the document.
 *
 * `undefined` means the step is not gated, so the tour does not wait.
 */
export function useNuxAnchorPresent(anchor: NuxAnchor | undefined): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      return _subscribeToAnchorPresence(anchor, onStoreChange);
    },
    () => {
      return _isAnchorInDocument(anchor);
    },
    () => {
      return true;
    },
  );
}
