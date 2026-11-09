import { isDefined } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { makeJenksBreaksFromValues } from "./makeJenksBreaksFromValues/makeJenksBreaksFromValues";

/** One feature id paired with the value used for classification. */
export type LayerValue = { featureId: string; value: unknown };

/** Class indexes, legend rows, and coverage counts for one layer's values. */
export type LayerClassification = {
  breaks: MapLayer.LegendBreak[];
  entries: MapLayer.LegendEntry[];
  classIndexByFeatureId: ReadonlyMap<string, number>;
  sourceValueCount: number;
  classifiedValueCount: number;
  distinctValueCount: number;
  didSample: boolean;
  /** Lowest and highest classified value, or `undefined` when none. */
  valueDomain: readonly [number, number] | undefined;
  recommendation: "classified" | "singleColor" | "noData";
};

type Options = {
  classification: MapLayer.Classification;
  ramp: readonly string[];
  noData: { color: string; label: string };
  classLabels: ReadonlyArray<string | undefined>;
};

function _makeQuantileCuts(
  sortedValues: readonly number[],
  classCount: number,
): number[] {
  const cuts = Array.from({ length: classCount - 1 }, (_, offset) => {
    const classIndex = offset + 1;
    let cutIndex = Math.ceil((classIndex * sortedValues.length) / classCount);
    while (
      cutIndex < sortedValues.length &&
      sortedValues[cutIndex] === sortedValues[cutIndex - 1]
    ) {
      cutIndex += 1;
    }
    return cutIndex < sortedValues.length ? sortedValues[cutIndex] : undefined;
  }).filter(isDefined);
  return [...new Set(cuts)];
}

function _makeEqualIntervalCuts(
  sortedValues: readonly number[],
  classCount: number,
): number[] {
  const minimum = sortedValues[0]!;
  const maximum = sortedValues.at(-1)!;
  const width = (maximum - minimum) / classCount;
  return Array.from({ length: classCount - 1 }, (_, index) => {
    return minimum + width * (index + 1);
  });
}

function _makeStandardDeviationCuts(
  sortedValues: readonly number[],
  classCount: number,
): readonly number[] {
  const mean =
    sortedValues.reduce((sum, value) => {
      return sum + value;
    }, 0) / sortedValues.length;
  const variance =
    sortedValues.reduce((sum, value) => {
      return sum + (value - mean) ** 2;
    }, 0) / sortedValues.length;
  const standardDeviation = Math.sqrt(variance);
  if (standardDeviation === 0) {
    return [];
  }
  return Array.from({ length: classCount - 1 }, (_, index) => {
    return mean + (index + 1 - classCount / 2) * standardDeviation * 0.5;
  }).filter((cut) => {
    return cut > sortedValues[0]! && cut <= sortedValues.at(-1)!;
  });
}

function _makeCuts(
  values: readonly number[],
  classification: MapLayer.Classification,
  classCount: number,
): { cuts: readonly number[]; didSample: boolean } {
  if (classification.method === "manual") {
    return { cuts: classification.breaks, didSample: false };
  }
  if (classification.method === "quantile") {
    return { cuts: _makeQuantileCuts(values, classCount), didSample: false };
  }
  if (classification.method === "equalInterval") {
    return {
      cuts: _makeEqualIntervalCuts(values, classCount),
      didSample: false,
    };
  }
  if (classification.method === "standardDeviation") {
    return {
      cuts: _makeStandardDeviationCuts(values, classCount),
      didSample: false,
    };
  }
  const jenks = makeJenksBreaksFromValues({ values, classCount });
  return { cuts: jenks.breaks, didSample: jenks.didSample };
}

function _buildBreaks(cuts: readonly number[]): MapLayer.LegendBreak[] {
  return Array.from({ length: cuts.length + 1 }, (_, index) => {
    return { lower: cuts[index - 1], upper: cuts[index] };
  });
}

/**
 * The generated legend label for one interval, such as `< 95` or `≥ 95`.
 * Use it wherever a class needs a name the user has not written, such as a
 * legend entry or the placeholder of a class label input.
 */
export function legendBreakToLabel(value: MapLayer.LegendBreak): string {
  if (value.lower === undefined) {
    return `< ${value.upper}`;
  }
  if (value.upper === undefined) {
    return `≥ ${value.lower}`;
  }
  return `${value.lower} to ${value.upper}`;
}

function _findClassIndex(value: number, cuts: readonly number[]): number {
  const cutIndex = cuts.findIndex((cut) => {
    return value < cut;
  });
  return cutIndex === -1 ? cuts.length : cutIndex;
}

function _countClasses(
  options: Readonly<{
    finiteValues: ReadonlyArray<{ featureId: string; value: number }>;
    cuts: readonly number[];
    classCount: number;
  }>,
): { classIndexByFeatureId: Map<string, number>; counts: number[] } {
  const classIndexByFeatureId = new Map<string, number>();
  const counts = Array.from({ length: options.classCount }, () => {
    return 0;
  });
  options.finiteValues.forEach(({ featureId, value }) => {
    const classIndex = _findClassIndex(value, options.cuts);
    classIndexByFeatureId.set(featureId, classIndex);
    counts[classIndex] = (counts[classIndex] ?? 0) + 1;
  });
  return { classIndexByFeatureId, counts };
}

function _buildValueEntries(
  options: Readonly<{
    breaks: readonly MapLayer.LegendBreak[];
    counts: readonly number[];
    ramp: readonly string[];
    classLabels: ReadonlyArray<string | undefined>;
  }>,
): MapLayer.LegendEntry[] {
  const { breaks, counts, ramp } = options;
  // A label names one interval, so labels apply only while the data still
  // yields exactly the classes they were written for.
  const labels =
    options.classLabels.length === breaks.length ? options.classLabels : [];
  return breaks.map((legendBreak, index): MapLayer.LegendEntry => {
    return {
      type: "value",
      color: ramp[Math.min(index, ramp.length - 1)] ?? "",
      label: labels[index] ?? legendBreakToLabel(legendBreak),
      count: counts[index] ?? 0,
    };
  });
}

function _getRecommendation(
  distinctValueCount: number,
): LayerClassification["recommendation"] {
  if (distinctValueCount === 0) {
    return "noData";
  }
  return distinctValueCount === 1 ? "singleColor" : "classified";
}

/** Classifies finite feature values into deterministic legend intervals. */
export function classifyLayerValues(
  sourceValues: readonly LayerValue[],
  options: Options,
): LayerClassification {
  const finiteValues = sourceValues.filter(
    (item): item is { featureId: string; value: number } => {
      return typeof item.value === "number" && Number.isFinite(item.value);
    },
  );
  const sortedNumbers = finiteValues
    .map(({ value }) => {
      return value;
    })
    .toSorted((left, right) => {
      return left - right;
    });
  const distinctValueCount = new Set(sortedNumbers).size;
  const classCount = Math.min(
    MapLayer.getGraduatedClassCount(options.classification),
    distinctValueCount,
  );
  const { cuts, didSample } =
    classCount === 0
      ? { cuts: [], didSample: false }
      : _makeCuts(sortedNumbers, options.classification, classCount);
  const breaks = classCount === 0 ? [] : _buildBreaks(cuts);
  const { classIndexByFeatureId, counts } = _countClasses({
    finiteValues,
    cuts,
    classCount: breaks.length,
  });
  const noDataCount = sourceValues.length - finiteValues.length;
  const noDataEntries: MapLayer.LegendEntry[] =
    noDataCount > 0
      ? [{ type: "noData", ...options.noData, count: noDataCount }]
      : [];
  return {
    breaks,
    entries: [
      ..._buildValueEntries({
        breaks,
        counts,
        ramp: options.ramp,
        classLabels: options.classLabels,
      }),
      ...noDataEntries,
    ],
    classIndexByFeatureId,
    sourceValueCount: sourceValues.length,
    classifiedValueCount: finiteValues.length,
    distinctValueCount,
    didSample,
    valueDomain:
      sortedNumbers.length === 0
        ? undefined
        : [sortedNumbers[0]!, sortedNumbers.at(-1)!],
    recommendation: _getRecommendation(distinctValueCount),
  };
}
