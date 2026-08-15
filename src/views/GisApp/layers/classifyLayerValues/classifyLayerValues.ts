import { makeJenksBreaks } from "./makeJenksBreaks";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

export type LayerValue = { featureId: string; value: unknown };

export type LayerClassification = {
  breaks: readonly MapLayer.LegendBreak[];
  entries: readonly MapLayer.LegendEntry[];
  classIndexByFeatureId: ReadonlyMap<string, number>;
  sourceValueCount: number;
  classifiedValueCount: number;
  distinctValueCount: number;
  didSample: boolean;
  recommendation: "classified" | "singleColor" | "noData";
};

type Options = {
  classification: MapLayer.Classification;
  ramp: readonly string[];
  noData: { color: string; label: string };
};

function _makeQuantileCuts(
  sortedValues: readonly number[],
  classCount: number,
): readonly number[] {
  const cuts: number[] = [];
  for (let classIndex = 1; classIndex < classCount; classIndex += 1) {
    let cutIndex = Math.ceil((classIndex * sortedValues.length) / classCount);
    while (
      cutIndex < sortedValues.length &&
      sortedValues[cutIndex] === sortedValues[cutIndex - 1]
    ) {
      cutIndex += 1;
    }
    if (cutIndex < sortedValues.length) {
      cuts.push(sortedValues[cutIndex]!);
    }
  }
  return [...new Set(cuts)];
}

function _makeEqualIntervalCuts(
  sortedValues: readonly number[],
  classCount: number,
): readonly number[] {
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
  const jenks = makeJenksBreaks(values, classCount);
  return { cuts: jenks.breaks, didSample: jenks.didSample };
}

function _buildBreaks(
  cuts: readonly number[],
): readonly MapLayer.LegendBreak[] {
  return Array.from({ length: cuts.length + 1 }, (_, index) => {
    return { lower: cuts[index - 1], upper: cuts[index] };
  });
}

function _formatBreak(value: MapLayer.LegendBreak): string {
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
  const requestedCount =
    options.classification.method === "manual" ?
      options.classification.breaks.length + 1
    : options.classification.classCount;
  const classCount = Math.min(requestedCount, distinctValueCount);
  const { cuts, didSample } =
    classCount === 0 ?
      { cuts: [], didSample: false }
    : _makeCuts(sortedNumbers, options.classification, classCount);
  const breaks = classCount === 0 ? [] : _buildBreaks(cuts);
  const classIndexByFeatureId = new Map<string, number>();
  const counts = Array.from({ length: breaks.length }, () => {
    return 0;
  });
  finiteValues.forEach(({ featureId, value }) => {
    const classIndex = _findClassIndex(value, cuts);
    classIndexByFeatureId.set(featureId, classIndex);
    counts[classIndex] = (counts[classIndex] ?? 0) + 1;
  });
  const entries: MapLayer.LegendEntry[] = breaks.map((value, index) => {
    return {
      type: "value",
      color: options.ramp[Math.min(index, options.ramp.length - 1)] ?? "",
      label: _formatBreak(value),
      count: counts[index] ?? 0,
    };
  });
  const noDataCount = sourceValues.length - finiteValues.length;
  if (noDataCount > 0) {
    entries.push({
      type: "noData",
      color: options.noData.color,
      label: options.noData.label,
      count: noDataCount,
    });
  }
  return {
    breaks,
    entries,
    classIndexByFeatureId,
    sourceValueCount: sourceValues.length,
    classifiedValueCount: finiteValues.length,
    distinctValueCount,
    didSample,
    recommendation:
      distinctValueCount === 0 ? "noData"
      : distinctValueCount === 1 ? "singleColor"
      : "classified",
  };
}
