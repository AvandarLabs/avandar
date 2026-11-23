import { useEffect, useState } from "react";

/** How long a linked comment stays highlighted, fade included. */
const HIGHLIGHT_DURATION_MS = 2400;

/**
 * Whether a linked comment should still look highlighted. The CSS fades
 * the highlight out; this drops it afterwards, which is all that happens
 * under reduced motion.
 */
export function useBriefHighlight(isHighlighted: boolean): boolean {
  const [isVisible, setIsVisible] = useState(isHighlighted);
  useEffect(() => {
    setIsVisible(isHighlighted);
    if (!isHighlighted) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, HIGHLIGHT_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isHighlighted]);
  return isVisible;
}
