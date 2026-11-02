import { useMemo } from "react";
import type { UnknownDataFrame } from "@avandar/utils";

/** Returns formatted X tick labels when rotation needs them for axis sizing. */
export function useXTickLabels({
  data,
  xAxisKey,
  tickAngle,
  tickFormatter,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  xAxisKey: string;
  tickAngle: number | undefined;
  tickFormatter: ((value: unknown) => string) | undefined;
}>): string[] | undefined {
  return useMemo(() => {
    if (tickAngle === undefined) {
      return undefined;
    }
    return data.map((row) => {
      const value = row[xAxisKey];
      return tickFormatter !== undefined
        ? tickFormatter(value)
        : String(value ?? "");
    });
  }, [data, xAxisKey, tickAngle, tickFormatter]);
}
