import { useLayoutEffect, useRef } from "react";
import { tagExplorerVideoTargets } from "./tagExplorerVideoTargets";
import type { ExplorerMode } from "../ExplorerTimeline";
import type { RefObject } from "react";
/**
 * Tags the explorer film's rendered product controls with
 * `data-video-target`, so the film can measure where its pointer lands, and
 * keeps the filter value input focused while the film types into it. Returns
 * the ref to attach to the root it searches. Called only by `ExplorerScreen`.
 */
export function useExplorerVideoTargets({
  frame,
  mode,
  time,
}: Readonly<{
  frame: number;
  mode: ExplorerMode;
  time: number;
}>): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement>(null);
  // Attribute-only instrumentation preserves the product DOM and styles.
  // Targets come from the actual rendered leaves, never estimated CSS
  // coordinates.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    tagExplorerVideoTargets({ root });
    const filterInput = root.querySelector<HTMLInputElement>(
      '[data-testid="filter-value-scalar"]',
    );
    if (filterInput && time >= 132 && time < 190) {
      filterInput.focus();
      filterInput.setSelectionRange(
        filterInput.value.length,
        filterInput.value.length,
      );
    } else if (filterInput && document.activeElement === filterInput) {
      filterInput.blur();
    }
  }, [frame, mode, time]);

  return rootRef;
}
