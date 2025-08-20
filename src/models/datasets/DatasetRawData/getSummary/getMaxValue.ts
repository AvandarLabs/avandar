export function getMaxValue(values: readonly unknown[]): number {
  return values.reduce((max: number, value: unknown) => {
    const numVal = Number(value);
    if (numVal > max) {
      return numVal;
    }
    return max;
  }, Number(values[0]));
}
