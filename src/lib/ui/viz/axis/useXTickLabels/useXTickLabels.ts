import { useMemo } from "react";
import type { UnknownDataFrame } from "@avandar/utils";

/**
 * The formatted X tick label strings, or `undefined` when the axis is
 * not rotated.
 *
 * Only a rotated axis needs these: `resolveTickRotation` sizes the axis
 * from the longest label, and measuring real text would mean rendering
 * it first. Returning `undefined` when `tickAngle` is unset keeps an
 * unrotated chart from scanning its data at all.
 *
 * The labels must be the *formatted* strings, not the raw cell values.
 * A date axis is drawn as `2014-01-01`, so sizing it against a raw epoch
 * number would overshoot badly.
 */
export function useXTickLabels(
  data: UnknownDataFrame,
  xAxisKey: string,
  tickAngle: number | undefined,
  tickFormatter: ((value: unknown) => string) | undefined,
): readonly string[] | undefined {
  return useMemo(() => {
    if (tickAngle === undefined) {
      return undefined;
    }
    return data.map((row) => {
      const value = row[xAxisKey];
      return tickFormatter !== undefined ?
          tickFormatter(value)
        : String(value ?? "");
    });
  }, [data, xAxisKey, tickAngle, tickFormatter]);
}
