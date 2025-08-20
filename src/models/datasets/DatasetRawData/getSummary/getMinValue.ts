export function getMinValue(values: readonly unknown[]): number {
  return values.reduce((min: number, value: unknown) => {
    const numVal = Number(value);
    if (numVal < min) {
      return numVal;
    }
    return min;
  }, Number(values[0]));
}
