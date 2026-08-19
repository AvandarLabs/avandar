import type { PlotFrame } from "../findPlotFrame/findPlotFrame";
import type { RegionGeometry, TextItem } from "../pdfSniff.types";

/** Baselines this far below the x-tick row are a second row, not jitter. */
const GROUP_LABEL_GAP = 3;

/**
 * A text item that is entirely numeric, matching `classifyRegion` so a tick
 * labelled `10,000` is a tick here too.
 */
const NUMERIC = /^[$€£¥]?\s*-?[\d][\d,. ]*\s*%?$/u;

type Bucket = Exclude<keyof TextPartition, "xGroupLabels" | "footnotes">;

/**
 * Text items grouped by where they sit relative to a plot frame.
 *
 * Only `dataLabels` belong to proximity pairing. Axis ticks, titles and
 * group labels are scaffolding: feeding them to the pairer is how a chart
 * title becomes a value.
 */
export type TextPartition = {
  dataLabels: TextItem[];
  yTicks: TextItem[];
  xTicks: TextItem[];
  xGroupLabels: TextItem[];
  title: TextItem[];
  footnotes: TextItem[];
  other: TextItem[];
};

function _emptyPartition(): TextPartition {
  return {
    dataLabels: [],
    yTicks: [],
    xTicks: [],
    xGroupLabels: [],
    title: [],
    footnotes: [],
    other: [],
  };
}

function _isNumeric(text: string): boolean {
  return NUMERIC.test(text.trim());
}

function _centerX(item: TextItem): number {
  return item.x + item.width / 2;
}

function _isInside(item: TextItem, frame: PlotFrame): boolean {
  const centerX = _centerX(item);
  return (
    centerX >= frame.left &&
    centerX <= frame.right &&
    item.y >= frame.bottom &&
    item.y <= frame.top
  );
}

function _bucketOf(item: TextItem, frame: PlotFrame): Bucket {
  if (item.y > frame.top) {
    return "title";
  }
  if (_isNumeric(item.text) && _centerX(item) < frame.left) {
    return "yTicks";
  }
  if (_isNumeric(item.text) && item.y < frame.bottom) {
    return "xTicks";
  }
  if (_isInside(item, frame)) {
    return "dataLabels";
  }
  return "other";
}

function _promoteGroupLabels(partition: TextPartition): TextPartition {
  if (partition.xTicks.length === 0) {
    return partition;
  }
  const xTickBaseline =
    partition.xTicks.reduce((sum, item) => {
      return sum + item.y;
    }, 0) / partition.xTicks.length;
  const xGroupLabels: TextItem[] = [];
  const other: TextItem[] = [];
  partition.other.forEach((item) => {
    if (item.y < xTickBaseline - GROUP_LABEL_GAP) {
      xGroupLabels.push(item);
    } else {
      other.push(item);
    }
  });
  return { ...partition, xGroupLabels, other };
}

/**
 * Assigns each visible text item a role relative to `frame`.
 */
export function partitionTextByFrame(
  region: RegionGeometry,
  frame: PlotFrame,
): TextPartition {
  const partition = _emptyPartition();
  region.textItems
    .filter((item) => {
      return item.text.trim().length > 0;
    })
    .forEach((item) => {
      partition[_bucketOf(item, frame)].push(item);
    });
  return _promoteGroupLabels(partition);
}
