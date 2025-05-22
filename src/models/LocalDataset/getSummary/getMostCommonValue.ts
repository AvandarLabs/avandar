/**
 * Returns the most common value in the array and the count of that value.
 * In case of a tie, all values with the same count are returned.
 *
 * This excludes empty values ("", undefined, null) from the count.
 *
 * @param values The array of values to analyze.
 * @returns An object containing the count of the most common value and the
 * value(s) itself.
 */
export function getMostCommonValue(values: readonly unknown[]): {
  count: number;
  value: string[];
} {
  const valueCounts = new Map<unknown, number>();
  let mostCommonValues: unknown[] = [];
  let mostCommonValueCount = 0;
  values.forEach((value) => {
    if (value === "" || value === undefined || value === null) {
      // skip empty values
      return;
    }

    const valueCount = (valueCounts.get(value) || 0) + 1;
    valueCounts.set(value, valueCount);

    // if its a tie
    if (valueCount === mostCommonValueCount) {
      mostCommonValues.push(value);
    }

    // if this is the new most common value
    if (valueCount > mostCommonValueCount) {
      mostCommonValues = [value];
      mostCommonValueCount = valueCount;
    }
  });

  return {
    count: mostCommonValueCount,
    value: mostCommonValues.map(String),
  };
}
