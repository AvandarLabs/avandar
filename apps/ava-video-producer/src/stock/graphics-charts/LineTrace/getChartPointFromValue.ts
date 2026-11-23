/** Projects LineTrace's values into the fixed authored chart bounds. */
export function getChartPointFromValue(
  options: Readonly<{ value: number; index: number; pointCount: number }>,
): { x: number; y: number } {
  return {
    x: 121 + options.index * (718 / (options.pointCount - 1)),
    y: 458 - options.value * 3.1,
  };
}
