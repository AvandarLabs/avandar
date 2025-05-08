export const ValueExtractorUtil = {
  /**
   * Returns the most frequent value in an array of values.
   * Or `undefined` if the array is empty.
   *
   * @param values
   * @returns
   */
  getMostFrequentValue<T>(values: T[]): T | undefined {
    if (values.length === 0) {
      return undefined;
    }

    const counts: Map<T | undefined, number> = new Map();
    let mostFrequentValue: T | undefined = undefined;

    values.forEach((value) => {
      const currentMax = counts.get(mostFrequentValue) ?? 0;
      const newCount = (counts.get(value) ?? 0) + 1;
      counts.set(value, newCount);
      if (newCount > currentMax) {
        mostFrequentValue = value;
      }
    });

    return mostFrequentValue;
  },

  /**
   * Returns the first value in an array of values.
   * Or `undefined` if the array is empty.
   *
   * @param values
   * @returns
   */
  getFirstValue<T>(values: T[]): T | undefined {
    return values[0];
  },
};
