export function getAverageValue(values: readonly unknown[]): number {
  return (
    values.reduce((sum: number, value: unknown) => {
      const numVal = Number(value);
      return sum + numVal;
    }, 0) / values.length
  );
}
