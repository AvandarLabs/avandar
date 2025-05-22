export function getEmptyValuesCount(values: readonly unknown[]): number {
  return values.filter((value) => {
    return value === "" || value === undefined || value === null;
  }).length;
}
