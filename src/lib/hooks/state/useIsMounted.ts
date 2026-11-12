import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * A ref that is true while the calling component is mounted. Read it in an
 * async callback that can finish after the user has left the page, for
 * example before navigating or opening a prompt from a finished request.
 */
export function useIsMounted(): RefObject<boolean> {
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  return isMountedRef;
}
