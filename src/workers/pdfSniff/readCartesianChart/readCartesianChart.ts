import type { AxisCalibration, AxisTick } from "../calibrateAxis/calibrateAxis";
import type { PlotFrame } from "../findPlotFrame/findPlotFrame";
import type {
  BBox,
  ChartAxisFit,
  ExtractedTable,
  PathMark,
  PathPoint,
  PdfCellFlag,
  RegionGeometry,
  TextItem,
} from "../pdfSniff.types";

import {
  applyCalibration,
  calibrateAxis,
} from "../calibrateAxis/calibrateAxis";
import { findPlotFrame } from "../findPlotFrame/findPlotFrame";
import { normalizeCellValue } from "../normalizeCellValue/normalizeCellValue";
import { partitionTextByFrame } from "../partitionTextByFrame/partitionTextByFrame";

const BASELINE_TOLERANCE = 1;
const MIN_SERIES_POINTS = 8;
const MIN_WIDTH_COVERAGE = 0.5;
const HIGH_RESIDUAL_POINTS = 1;

function _parseTickValue(text: string): number | undefined {
  const value = Number(normalizeCellValue(text));
  return Number.isFinite(value) ? value : undefined;
}

function _centerX(item: TextItem): number {
  return item.x + item.width / 2;
}

function _markCoversFrame(mark: PathMark, frame: PlotFrame): boolean {
  const overlapX =
    Math.min(mark.bbox[2], frame.right) - Math.max(mark.bbox[0], frame.left);
  return overlapX >= MIN_WIDTH_COVERAGE * (frame.right - frame.left);
}

/**
 * The path a line or area series was drawn with, if the region holds one.
 *
 * A series is the longest path that crosses most of the plot: an area fill
 * and its outline both qualify, and a gridline, a legend swatch and a bar do
 * not, because none of them has more than a handful of vertices.
 *
 * Exported so that type detection asks the same question the reader answers.
 * Two spellings of "is this a line chart" is two things to keep in step.
 */
export function findSeriesMark(
  region: RegionGeometry,
  frame: PlotFrame,
): PathMark | undefined {
  return [...(region.marks ?? [])]
    .filter((mark) => {
      return (
        mark.kind === "closed" &&
        mark.points.length >= MIN_SERIES_POINTS &&
        _markCoversFrame(mark, frame)
      );
    })
    .sort((left, right) => {
      return right.points.length - left.points.length;
    })[0];
}

function _seriesVertices(mark: PathMark, frame: PlotFrame): PathPoint[] {
  return mark.points
    .filter((point) => {
      return Math.abs(point.y - frame.bottom) > BASELINE_TOLERANCE;
    })
    .sort((left, right) => {
      return left.x - right.x;
    });
}

function _nearestVertex(
  vertices: readonly PathPoint[],
  x: number,
): PathPoint | undefined {
  return [...vertices].sort((left, right) => {
    return Math.abs(left.x - x) - Math.abs(right.x - x);
  })[0];
}

function _yAxisTicks(
  yTicks: readonly TextItem[],
  hints: readonly AxisTick[],
): readonly AxisTick[] {
  if (calibrateAxis(hints) !== undefined) {
    return hints;
  }
  return yTicks.flatMap((item) => {
    const value = _parseTickValue(item.text);
    return value === undefined ? [] : [{ position: item.y, value }];
  });
}

function _chartAxis(
  calibration: AxisCalibration,
  ticks: readonly AxisTick[],
): ChartAxisFit {
  const values = ticks.map((tick) => {
    return tick.value;
  });
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    scale: calibration.scale,
    tickCount: ticks.length,
    maxResidual: calibration.maxResidual,
  };
}

function _vertexBox(point: PathPoint): BBox {
  return [point.x - 2, point.y - 2, point.x + 2, point.y + 2];
}

function _flagsFor(calibration: AxisCalibration): PdfCellFlag[] {
  if (calibration.maxResidual <= HIGH_RESIDUAL_POINTS) {
    return [];
  }
  return [
    {
      rowIndex: -1,
      columnIndex: -1,
      reason: "high_residual",
      detail:
        `Y-axis calibration residual is ${calibration.maxResidual.toFixed(1)} ` +
        "pt. Values are still arithmetic from the fit, but check them " +
        "against the page.",
    },
  ];
}

function _sortedXTicks(ticks: readonly TextItem[]): TextItem[] {
  return [...ticks].sort((left, right) => {
    return left.x - right.x;
  });
}

function _seriesRows(
  ticks: readonly TextItem[],
  vertices: readonly PathPoint[],
  calibration: AxisCalibration,
  fallbackBBox: BBox,
): Array<{ week: string; value: string; bbox: BBox }> {
  return ticks.map((tick) => {
    const vertex = _nearestVertex(vertices, _centerX(tick));
    const value =
      vertex === undefined
        ? 0
        : Math.max(0, Math.round(applyCalibration(calibration, vertex.y)));
    return {
      week: tick.text.trim(),
      value: String(value),
      bbox: vertex === undefined ? fallbackBBox : _vertexBox(vertex),
    };
  });
}

/** Options for {@link readCartesianChart}. */
export type CartesianChartOptions = {
  regionId: string;
  /** Two or more (position, value) points on the y-axis, from the user. */
  yAxisHints?: readonly AxisTick[];
};

/**
 * Reads a Cartesian line or area chart from plot-frame geometry.
 *
 * Returns `undefined` when the region has no plot, no calibratable y-axis,
 * or no area/line mark covering the frame, so the caller can fall through
 * to text pairing.
 */
export function readCartesianChart(
  region: RegionGeometry,
  options: CartesianChartOptions,
): ExtractedTable | undefined {
  const frame = findPlotFrame(region);
  if (frame === undefined) {
    return undefined;
  }
  const partition = partitionTextByFrame(region, frame);
  const axisTicks = _yAxisTicks(partition.yTicks, options.yAxisHints ?? []);
  const calibration = calibrateAxis(axisTicks);
  const mark = findSeriesMark(region, frame);
  if (calibration === undefined || mark === undefined) {
    return undefined;
  }
  const vertices = _seriesVertices(mark, frame);
  const xTicks = _sortedXTicks(partition.xTicks);
  if (vertices.length < MIN_SERIES_POINTS || xTicks.length === 0) {
    return undefined;
  }
  const rows = _seriesRows(xTicks, vertices, calibration, region.bbox);
  return {
    regionId: options.regionId,
    cells: [
      ["week", "value"],
      ...rows.map((row) => {
        return [row.week, row.value];
      }),
    ],
    headerRows: 1,
    flags: _flagsFor(calibration),
    extractedBy: "rules",
    rowProvenance: rows.map((row) => {
      return { page: region.pageIndex, bbox: row.bbox };
    }),
    rowUnits: rows.map(() => {
      return "n" as const;
    }),
    chartAxis: _chartAxis(calibration, axisTicks),
  };
}
