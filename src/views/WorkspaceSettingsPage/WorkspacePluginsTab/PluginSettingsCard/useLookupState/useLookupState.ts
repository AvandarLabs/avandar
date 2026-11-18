import { useEffect, useState } from "react";

/**
 * Where a lookup stands for someone who may retry it: fine, failed for good,
 * or failed earlier and being asked for again.
 */
export type LookupState = "ok" | "failed" | "retrying";

/**
 * Tells a lookup that is retrying after a failure from one that is loading
 * for the first time. A query that never returned data drops its error the
 * moment a retry starts, so the error flag alone cannot say a retry is
 * running, and a failure shown to the user would vanish for the retry.
 *
 * Use it to keep an error and its Retry button on screen until the retry
 * settles, for example in a card that depends on a lookup.
 */
export function useLookupState(options: {
  hasFailed: boolean;
  isLoading: boolean;
}): LookupState {
  const { hasFailed, isLoading } = options;
  const [hasFailedBefore, setHasFailedBefore] = useState(false);
  useEffect(() => {
    if (hasFailed) {
      setHasFailedBefore(true);
    } else if (!isLoading) {
      setHasFailedBefore(false);
    }
  }, [hasFailed, isLoading]);
  if (hasFailed) {
    return "failed";
  }
  return hasFailedBefore && isLoading ? "retrying" : "ok";
}
