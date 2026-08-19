import type { AssembledLabel, TextItem } from "../pdfSniff.types";

/**
 * Above this best-to-runner-up distance ratio, a pair is flagged for review.
 *
 * 0.8 was chosen from the design measurement against the OCHA choropleth: it
 * caught one of the two mistakes without flagging so much that review becomes
 * meaningless. It is not a confidence score, it is a "these two candidates
 * were nearly tied" signal.
 */
const DEFAULT_AMBIGUITY_THRESHOLD = 0.8;

export type ProximityPair = {
  value: string;
  label: string;
  /** Distance to the chosen label, in points. */
  distance: number;
  /** `bestDistance / runnerUpDistance`, or 0 when there is no runner-up. */
  ambiguityRatio: number;
  isAmbiguous: boolean;
  valueItem: TextItem;
  labelCentroid: { cx: number; cy: number };
};

export type ProximityResult = {
  pairs: readonly ProximityPair[];
  /** Labels that no value was assigned to, in input order. */
  unmatchedLabels: readonly string[];
  /** Values that no label was assigned to, in input order. */
  unmatchedValues: readonly string[];
};

function _distance(item: TextItem, label: AssembledLabel): number {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  return Math.hypot(cx - label.cx, cy - label.cy);
}

/**
 * Associates values with labels using position alone.
 *
 * Necessary because in a map or a labelled chart the PDF records no
 * relationship between a number and its caption: they are separate text items
 * that happen to be near each other, and reading order actively destroys the
 * pairing.
 *
 * Measured against the OCHA choropleth during design at 14 of 16 correct, with
 * 5 flagged and 1 silently wrong. That result is why this returns an
 * ambiguity signal and why the UI must never import its output unreviewed.
 *
 * Assignment is greedy by distance and one-to-one: the closest value-label
 * pair is fixed first, then the next closest among what remains. A label
 * cannot take two values, because a graphic where that looks true is one we
 * have misread.
 */
export function pairByProximity({
  values,
  labels,
  ambiguityThreshold = DEFAULT_AMBIGUITY_THRESHOLD,
}: {
  values: readonly TextItem[];
  labels: readonly AssembledLabel[];
  ambiguityThreshold?: number;
}): ProximityResult {
  const threshold = ambiguityThreshold;

  const scored = values.flatMap((valueItem) => {
    return labels.map((label) => {
      return { valueItem, label, distance: _distance(valueItem, label) };
    });
  });
  scored.sort((a, b) => {
    return a.distance - b.distance;
  });

  const usedValues = new Set<TextItem>();
  const usedLabels = new Set<AssembledLabel>();
  const pairs: ProximityPair[] = [];

  for (const candidate of scored) {
    if (
      usedValues.has(candidate.valueItem) ||
      usedLabels.has(candidate.label)
    ) {
      continue;
    }
    usedValues.add(candidate.valueItem);
    usedLabels.add(candidate.label);

    // The runner-up is the nearest label this value did NOT get, whether or
    // not that label is still free: what matters is how close the decision
    // was, not what happened to it afterwards.
    const runnerUp = labels
      .filter((label) => {
        return label !== candidate.label;
      })
      .reduce<number>((best, label) => {
        return Math.min(best, _distance(candidate.valueItem, label));
      }, Number.POSITIVE_INFINITY);

    const ambiguityRatio =
      Number.isFinite(runnerUp) && runnerUp > 0 ?
        candidate.distance / runnerUp
      : 0;

    pairs.push({
      value: candidate.valueItem.text,
      label: candidate.label.text,
      distance: candidate.distance,
      ambiguityRatio,
      isAmbiguous: ambiguityRatio > threshold,
      valueItem: candidate.valueItem,
      labelCentroid: { cx: candidate.label.cx, cy: candidate.label.cy },
    });
  }

  return {
    pairs,
    unmatchedLabels: labels
      .filter((label) => {
        return !usedLabels.has(label);
      })
      .map((label) => {
        return label.text;
      }),
    unmatchedValues: values
      .filter((item) => {
        return !usedValues.has(item);
      })
      .map((item) => {
        return item.text;
      }),
  };
}
