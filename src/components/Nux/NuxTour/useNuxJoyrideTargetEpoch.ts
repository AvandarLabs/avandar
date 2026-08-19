import { useEffect, useRef, useState } from "react";
import { nextNuxJoyrideTargetEpoch } from "@/components/Nux/NuxTour/nextNuxJoyrideTargetEpoch/nextNuxJoyrideTargetEpoch";
import { useNuxLaidOutTarget } from "@/components/Nux/NuxTour/useNuxLaidOutTarget/useNuxLaidOutTarget";
import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";

const LAID_OUT_TARGET_SETTLE_MS = 50;

/**
 * Remount generation for Joyride when the current step's laid-out target
 * is replaced.
 *
 * Joyride captures an HTMLElement on first find. A later Puck remount of
 * that node leaves the tooltip measuring a detached copy at 0,0 unless
 * the tour remounts onto the new node. Puck remounts the header several
 * times in one click, so wait until Share is stable before bumping: one
 * remount after it settles, not one per intermediate node.
 */
export function useNuxJoyrideTargetEpoch(
  anchor: NuxAnchor | undefined,
): number {
  const laidOutTarget = useNuxLaidOutTarget(anchor);
  const [epoch, setEpoch] = useState(0);
  const epochRef = useRef(0);
  const settledTargetRef = useRef<HTMLElement | null>(null);

  if (laidOutTarget !== null && settledTargetRef.current === null) {
    settledTargetRef.current = laidOutTarget;
  }

  useEffect(
    function remountJoyrideAfterLaidOutTargetSettles() {
      if (laidOutTarget === null) {
        return;
      }
      const timeoutId = window.setTimeout(() => {
        const nextEpoch = nextNuxJoyrideTargetEpoch({
          previousTarget: settledTargetRef.current,
          nextTarget: laidOutTarget,
          epoch: epochRef.current,
        });
        settledTargetRef.current = laidOutTarget;
        if (nextEpoch === epochRef.current) {
          return;
        }
        epochRef.current = nextEpoch;
        setEpoch(nextEpoch);
      }, LAID_OUT_TARGET_SETTLE_MS);
      return () => {
        window.clearTimeout(timeoutId);
      };
    },
    [laidOutTarget],
  );

  return epoch;
}
