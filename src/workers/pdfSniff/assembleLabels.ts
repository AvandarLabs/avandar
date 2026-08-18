import type { AssembledLabel, BBox, TextItem } from "./types";

/**
 * Maximum horizontal gap, in points, between two words on the same line for
 * them to belong to one label.
 *
 * Measured as the EDGE gap, not the distance between centres. Centre distance
 * scales with word length, so a centre-based test never merges long words:
 * that bug split RED SEA into two labels during design.
 */
const SAME_LINE_MAX_GAP = 8;

/** Baselines within this differ by less than a line and count as the same. */
const SAME_LINE_TOLERANCE = 3.5;

/**
 * Maximum distance between x centres for two lines to be one wrapped label.
 *
 * Tight on purpose. On a dense map, neighbouring place names sit closer to
 * each other than a wrapped name's two halves sit to anything else, so a
 * loose test fuses KHARTOUM with KASSALA.
 */
const STACKED_MAX_CENTRE_DELTA = 12;

/** Vertical gap that counts as the next line rather than a distant label. */
const STACKED_MAX_LINE_GAP = 11;

/**
 * A group of text items being assembled into one label, tracked by its own
 * bounding box and mean baseline.
 *
 * A single pairwise pass over the original items is not enough: merging WEST
 * and NORTH on one line shifts the pair's centre to 129, which is within
 * range of KORDOFAN below even though neither WEST's centre (112.5) nor
 * NORTH's alone (143) is. Later merge checks must compare against this
 * running geometry, not against an original item's, or that third fragment
 * never joins the group.
 */
type Cluster = {
  items: TextItem[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  meanY: number;
};

function _clusterOf(item: TextItem): Cluster {
  return {
    items: [item],
    x0: item.x,
    y0: item.y,
    x1: item.x + item.width,
    y1: item.y + item.height,
    meanY: item.y,
  };
}

function _shouldMerge(a: Cluster, b: Cluster): boolean {
  const dy = Math.abs(a.meanY - b.meanY);

  if (dy < SAME_LINE_TOLERANCE) {
    const gap = Math.max(b.x0 - a.x1, a.x0 - b.x1);
    return gap <= SAME_LINE_MAX_GAP;
  }

  if (dy <= STACKED_MAX_LINE_GAP) {
    const centreA = (a.x0 + a.x1) / 2;
    const centreB = (b.x0 + b.x1) / 2;
    return Math.abs(centreA - centreB) <= STACKED_MAX_CENTRE_DELTA;
  }

  return false;
}

function _merge(a: Cluster, b: Cluster): Cluster {
  const items = [...a.items, ...b.items];
  return {
    items,
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
    meanY:
      items.reduce((sum, item) => {
        return sum + item.y;
      }, 0) / items.length,
  };
}

/** Index pair `[i, j]` of the first mergeable pair of clusters, if any. */
function _findMergeablePair(
  clusters: readonly Cluster[],
): readonly [number, number] | undefined {
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      if (_shouldMerge(clusters[i]!, clusters[j]!)) {
        return [i, j];
      }
    }
  }
  return undefined;
}

function _toLabel(cluster: Cluster): AssembledLabel {
  const ordered = [...cluster.items].sort((a, b) => {
    // Reading order within the label: top line first, then left to right.
    const dy = b.y - a.y;
    return Math.abs(dy) > SAME_LINE_TOLERANCE ? dy : a.x - b.x;
  });

  const bbox: BBox = [cluster.x0, cluster.y0, cluster.x1, cluster.y1];

  return {
    text: ordered
      .map((i) => {
        return i.text;
      })
      .join(" "),
    cx: (cluster.x0 + cluster.x1) / 2,
    cy: (cluster.y0 + cluster.y1) / 2,
    bbox,
    items: ordered,
  };
}

/**
 * Groups text items into whole labels.
 *
 * Exists because a map label like NORTH DARFUR arrives as two or three
 * separate text items, and matching values to half a name produces confident
 * nonsense. Getting this wrong was the single largest source of error when
 * the association algorithm was measured against the OCHA choropleth during
 * design, in both directions: too greedy fused adjacent states, too strict
 * split two-word names.
 *
 * Merging is agglomerative rather than a single pairwise pass: after any
 * merge the combined cluster's bounding box replaces its two members for all
 * further comparisons, so a later merge can be decided by geometry that did
 * not exist on the first pass (see `Cluster`'s docstring).
 */
export function assembleLabels(
  items: readonly TextItem[],
): readonly AssembledLabel[] {
  let clusters: Cluster[] = items.map(_clusterOf);

  let pair = _findMergeablePair(clusters);
  while (pair) {
    const [i, j] = pair;
    const next = [...clusters];
    // Remove the higher index first so the lower index stays valid.
    next.splice(j, 1);
    next.splice(i, 1, _merge(clusters[i]!, clusters[j]!));
    clusters = next;
    pair = _findMergeablePair(clusters);
  }

  return clusters.map(_toLabel);
}
