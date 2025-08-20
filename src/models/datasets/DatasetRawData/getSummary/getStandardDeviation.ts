import { getAverageValue } from "./getAverageValue";

export function getStandardDeviation(values: readonly unknown[]): number {
  if (values.length < 2) {
    return 0; // there is no variance with less than 2 values
  }

  const average = getAverageValue(values);
  const variance =
    values.reduce((sum: number, value: unknown) => {
      const numVal = Number(value);
      return sum + Math.pow(numVal - average, 2);
    }, 0) /
    (values.length - 1); // Bessel's correction for sample standard deviation
  return Math.sqrt(variance);
}
