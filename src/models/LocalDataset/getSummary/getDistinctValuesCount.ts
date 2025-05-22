export function getDistinctValuesCount(values: readonly unknown[]): number {
  const distinctValues = new Set(values);
  return distinctValues.size;
}
