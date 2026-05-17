import { useEffect, useMemo, useRef } from "react";
import { notifyWarning } from "@ui";
import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import type { VizRenderLimitKey } from "$/config/GlobalVizConfig";

/**
 * Caps `data` at the per-viz row limit defined in `VIZ_RENDER_LIMITS` and
 * surfaces a one-shot warning toast when truncation kicks in. The toast only
 * fires on transitions from "within limit" to "over limit" so that scrolling,
 * re-renders, or unrelated prop changes don't spam the user.
 *
 * Returns the data unchanged when it fits under the cap, so memo identity is
 * preserved and downstream `useMemo`s don't invalidate unnecessarily.
 */
export function useVizDataLimit<TRow>(
  vizType: VizRenderLimitKey,
  data: TRow[],
): TRow[] {
  const limit = VIZ_RENDER_LIMITS[vizType];

  const limitedData = useMemo(() => {
    return data.length > limit.max ? data.slice(0, limit.max) : data;
  }, [data, limit.max]);

  const prevExceededRef = useRef(false);
  useEffect(() => {
    const exceeded = data.length > limit.max;
    if (exceeded && !prevExceededRef.current) {
      notifyWarning({
        title: `${limit.name} data truncated`,
        message: `The ${limit.name} can only render up to ${limit.max} ${limit.noun}, so only displaying the first ${limit.max}.`,
      });
    }
    prevExceededRef.current = exceeded;
  }, [data.length, limit]);

  return limitedData;
}
