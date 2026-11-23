import { useLayoutEffect } from "react";
import { continueRender, delayRender } from "remotion";

type Props = {
  label: string;
  prepare: (complete: () => void) => (() => void) | undefined;
};

/**
 * Blocks a frame until its external renderer completes, releasing it on
 * cleanup.
 */
export function useCommittedRenderDelay({
  label,
  prepare,
}: Readonly<Props>): void {
  useLayoutEffect(() => {
    const handle = delayRender(label);
    const cleanup = prepare(() => {
      return continueRender(handle);
    });
    return () => {
      cleanup?.();
      continueRender(handle);
    };
  }, [label, prepare]);
}
