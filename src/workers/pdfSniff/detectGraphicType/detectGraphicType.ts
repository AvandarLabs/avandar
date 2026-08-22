import type { BarFamily } from "../findBarFamily/findBarFamily";
import type { PlotFrame } from "../findPlotFrame/findPlotFrame";
import type { RegionGeometry } from "../pdfSniff.types";

import { findBarFamily } from "../findBarFamily/findBarFamily";
import { findPlotFrame } from "../findPlotFrame/findPlotFrame";
import { findSeriesMark } from "../readCartesianChart/readCartesianChart";

/**
 * What a graphic region was drawn as, judged from its marks alone.
 *
 * Only the kinds a reader exists for are named. A choropleth and a row of KPI
 * tiles are both `unknown` here, not because they are unrecognisable in
 * principle but because nothing downstream would do anything different with
 * the answer, and a type we cannot act on is a claim we should not make.
 */
export type GraphicType =
  | "bar_chart"
  | "column_chart"
  | "line_area_chart"
  | "unknown";

export type GraphicDetection = {
  kind: GraphicType;
  /** Why, in the same voice as `classifyRegion`'s own evidence. */
  evidence: readonly string[];
};

function _plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function _distinctLengths(family: BarFamily): number {
  return new Set(
    family.bars.map((bar) => {
      return Math.round(bar.freeEdge - family.baseline);
    }),
  ).size;
}

function _barEvidence(family: BarFamily): string {
  const edge = family.orientation === "bar" ? "left" : "bottom";
  return (
    `${_plural(family.bars.length, "bar")} growing from a shared ${edge} ` +
    `edge, in ${_distinctLengths(family)} different lengths.`
  );
}

function _frameEvidence(frame: PlotFrame): string {
  return (
    `Axes meeting at a corner, ` +
    `${_plural(frame.gridlines.length, "gridline")} across the plot`
  );
}

function _filledShapeCount(region: RegionGeometry): number {
  return region.marks.filter((mark) => {
    return mark.isFilled;
  }).length;
}

/**
 * Decides what kind of graphic a region is, from its retained geometry.
 *
 * This is deliberately separate from `classifyRegion`, which chooses the
 * extractor from the text. That cascade cannot tell a bar chart from a map
 * because it has never seen a mark; this one only ever looks at marks. The
 * two are combined rather than merged so that neither has to answer a
 * question it has no evidence for.
 */
export function detectGraphicType(region: RegionGeometry): GraphicDetection {
  const family = findBarFamily(region);
  if (family !== undefined) {
    return {
      kind: family.orientation === "bar" ? "bar_chart" : "column_chart",
      evidence: [_barEvidence(family)],
    };
  }
  const frame = findPlotFrame(region);
  if (frame !== undefined) {
    const series = findSeriesMark(region, frame);
    if (series !== undefined) {
      return {
        kind: "line_area_chart",
        evidence: [
          `${_frameEvidence(frame)}, and a series path of ` +
            `${_plural(series.points.length, "point")} across it.`,
        ],
      };
    }
    return {
      kind: "unknown",
      evidence: [`${_frameEvidence(frame)}, but no series drawn across it.`],
    };
  }
  return {
    kind: "unknown",
    evidence: [
      `${_plural(_filledShapeCount(region), "filled shape")}, forming ` +
        "neither a plot's axes nor a family of bars.",
    ],
  };
}
