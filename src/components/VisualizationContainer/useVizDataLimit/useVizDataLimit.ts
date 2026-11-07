import { t } from "@lingui/core/macro";
import { useEffect, useMemo, useRef } from "react";
import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { notifyWarning } from "@/utils/notifications/notify";
import type { VizRenderLimitKey } from "$/config/GlobalVizConfig";

/**
 * Chart types that draw a series over an axis, where every point is part of
 * one trend. Keeping only the first points of a long series would hide the
 * end of the range, as if a pandemic stopped in mid-2021, so these are
 * sampled evenly across the whole range instead.
 */
const SAMPLED_VIZ_TYPES: ReadonlySet<VizRenderLimitKey> = new Set([
  "line",
  "area",
]);

/** Every `step`-th row from the first, plus the last row, within `max`. */
function _sampleEvenly<TRow>(data: readonly TRow[], max: number): TRow[] {
  const step = Math.ceil(data.length / (max - 1));
  const sampled = data.filter((_row, index) => {
    return index % step === 0;
  });
  const lastRow = data.at(-1);
  return lastRow === undefined || sampled.at(-1) === lastRow
    ? sampled
    : [...sampled, lastRow];
}

/**
 * Caps `data` at the per-viz row limit defined in `VIZ_RENDER_LIMITS` and
 * surfaces a one-shot warning toast when the cap kicks in. Line and area
 * charts are sampled evenly across the whole range; other charts keep their
 * first rows. The toast only fires on transitions from "within limit" to
 * "over limit" so that scrolling, re-renders, or unrelated prop changes don't
 * spam the user.
 *
 * Returns the data unchanged when it fits under the cap, so memo identity is
 * preserved and downstream `useMemo`s don't invalidate unnecessarily.
 */
export function useVizDataLimit<TRow>(
  vizType: VizRenderLimitKey,
  data: TRow[],
): TRow[] {
  const limit = VIZ_RENDER_LIMITS[vizType];
  const max = limit?.max ?? Infinity;
  const isSampled = SAMPLED_VIZ_TYPES.has(vizType);

  const limitedData = useMemo(() => {
    if (data.length <= max) {
      return data;
    }
    return isSampled ? _sampleEvenly(data, max) : data.slice(0, max);
  }, [data, max, isSampled]);

  const prevExceededRef = useRef(false);
  useEffect(() => {
    const exceeded = limit !== undefined && data.length > limit.max;
    if (exceeded && !prevExceededRef.current) {
      notifyWarning({
        title: t`${vizTypeLabel(vizType)} data truncated`,
        message: isSampled
          ? t`The ${vizTypeLabel(vizType)} can only render up to ${limit.max} ${limit.noun}, so it shows an even sample of the ${data.length} rows across the whole range.`
          : t`The ${vizTypeLabel(vizType)} can only render up to ${limit.max} ${limit.noun}, so only displaying the first ${limit.max}.`,
      });
    }
    prevExceededRef.current = exceeded;
  }, [data.length, limit, vizType, isSampled]);

  return limitedData;
}
