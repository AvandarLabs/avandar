const MAX_JENKS_VALUE_COUNT = 5_000;

export type JenksBreakResult = {
  breaks: readonly number[];
  didSample: boolean;
  sampledValueCount: number;
};

function _sampleSortedValues(values: readonly number[]): readonly number[] {
  if (values.length <= MAX_JENKS_VALUE_COUNT) {
    return values;
  }
  return Array.from({ length: MAX_JENKS_VALUE_COUNT }, (_, sampleIndex) => {
    const sourceIndex = Math.round(
      (sampleIndex * (values.length - 1)) / (MAX_JENKS_VALUE_COUNT - 1),
    );
    return values[sourceIndex]!;
  });
}

function _buildPrefixSums(values: readonly number[]): {
  sums: Float64Array;
  squaredSums: Float64Array;
} {
  const sums = new Float64Array(values.length + 1);
  const squaredSums = new Float64Array(values.length + 1);
  values.forEach((value, index) => {
    sums[index + 1] = sums[index]! + value;
    squaredSums[index + 1] = squaredSums[index]! + value * value;
  });
  return { sums, squaredSums };
}

function _segmentVariance(
  start: number,
  end: number,
  sums: Float64Array,
  squaredSums: Float64Array,
): number {
  const count = end - start;
  const sum = sums[end]! - sums[start]!;
  const squaredSum = squaredSums[end]! - squaredSums[start]!;
  return squaredSum - (sum * sum) / count;
}

function _calculateCuts(
  values: readonly number[],
  classCount: number,
): readonly number[] {
  const { sums, squaredSums } = _buildPrefixSums(values);
  let previousCosts = new Float64Array(values.length + 1).fill(Infinity);
  previousCosts[0] = 0;
  const cutRows: Int32Array[] = [];
  for (let classIndex = 1; classIndex <= classCount; classIndex += 1) {
    const costs = new Float64Array(values.length + 1).fill(Infinity);
    const cuts = new Int32Array(values.length + 1);
    for (let end = classIndex; end <= values.length; end += 1) {
      for (let start = classIndex - 1; start < end; start += 1) {
        const cost =
          previousCosts[start]! +
          _segmentVariance(start, end, sums, squaredSums);
        if (cost < costs[end]!) {
          costs[end] = cost;
          cuts[end] = start;
        }
      }
    }
    cutRows.push(cuts);
    previousCosts = costs;
  }
  return _backtrackCuts(values, cutRows, classCount);
}

function _backtrackCuts(
  values: readonly number[],
  cutRows: readonly Int32Array[],
  classCount: number,
): readonly number[] {
  const cuts: number[] = [];
  let end = values.length;
  for (let classIndex = classCount; classIndex > 1; classIndex -= 1) {
    const start = cutRows[classIndex - 1]![end]!;
    cuts.unshift(values[start]!);
    end = start;
  }
  return [...new Set(cuts)];
}

/** Calculates deterministic Jenks natural-break cut values. */
export function makeJenksBreaks(
  inputValues: readonly number[],
  requestedClassCount: number,
): JenksBreakResult {
  const sortedValues = inputValues
    .filter(Number.isFinite)
    .toSorted((left, right) => {
      return left - right;
    });
  const sampledValues = _sampleSortedValues(sortedValues);
  const distinctValueCount = new Set(sampledValues).size;
  const classCount = Math.min(requestedClassCount, distinctValueCount);
  return {
    breaks: classCount <= 1 ? [] : _calculateCuts(sampledValues, classCount),
    didSample: sortedValues.length > MAX_JENKS_VALUE_COUNT,
    sampledValueCount: sampledValues.length,
  };
}
