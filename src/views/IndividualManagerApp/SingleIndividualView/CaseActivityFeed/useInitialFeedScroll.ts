import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Once a case's feed is ready, scrolls the linked comment into view, or
 * `endRef`, placed after the docked composer, so the newest entry sits just
 * above the composer. Happens once per case and link, so a refetch or a new
 * post never moves the reader.
 */
export function useInitialFeedScroll(options: {
  individualId: string;
  highlightedCommentId: string | undefined;
  isReady: boolean;
  endRef: RefObject<HTMLElement | null>;
}): void {
  const { individualId, highlightedCommentId, isReady, endRef } = options;
  const scrolledKeyRef = useRef<string | undefined>(undefined);
  const scrollKey = `${individualId}:${highlightedCommentId ?? ""}`;

  useEffect(() => {
    if (!isReady || scrolledKeyRef.current === scrollKey) {
      return;
    }
    scrolledKeyRef.current = scrollKey;
    const linkedComment = highlightedCommentId
      ? document.getElementById(`comment-${highlightedCommentId}`)
      : undefined;
    if (linkedComment) {
      linkedComment.scrollIntoView({ block: "center" });
    } else {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isReady, scrollKey, highlightedCommentId, endRef]);
}
