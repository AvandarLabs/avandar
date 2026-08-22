import { assembleLabels } from "../assembleLabels/assembleLabels";
import { assembleQuantities } from "../assembleQuantities/assembleQuantities";
import {
  applyCalibration,
  calibrateAxis,
  invertCalibration,
} from "../calibrateAxis/calibrateAxis";
import { findBarFamily } from "../findBarFamily/findBarFamily";
import { findPlotFrame } from "../findPlotFrame/findPlotFrame";
import { normalizeCellValue } from "../normalizeCellValue/normalizeCellValue";
import { partitionTextByFrame } from "../partitionTextByFrame/partitionTextByFrame";
import type { AssembledQuantity } from "../assembleQuantities/assembleQuantities";
import type { AxisCalibration, AxisTick } from "../calibrateAxis/calibrateAxis";
import type { Bar, BarFamily } from "../findBarFamily/findBarFamily";
import type {
  AssembledLabel,
  BBox,
  ChartAxisFit,
  ExtractedTable,
  PdfCellFlag,
  PdfValueUnit,
  RegionGeometry,
  TextItem,
} from "../pdfSniff.types";

/**
 * How far a printed figure may sit from the length its own bar was drawn at
 * before we say so. Two points is under a fifth of a bar's thickness on the
 * charts this was measured against, and well inside the rounding a chart that
 * prints `3M` for 3,041,000 already carries.
 */
const RESIDUAL_TOLERANCE = 2;

/** Where the numbers behind the value axis came from. */
type TickSource = "hints" | "axis" | "labels";

type ValueScale = {
  source: TickSource;
  ticks: readonly AxisTick[];
  /** Tick labels the chart printed, which are scaffolding rather than rows. */
  consumed: readonly TextItem[];
};

type Row = {
  label: string;
  /** The bar on this row, if the chart drew one. */
  bar: Bar | undefined;
  /** The figure printed on this row, if the chart printed one. */
  quantity: AssembledQuantity | undefined;
  /** Where this row sits along the category axis. */
  category: number;
};

function _numericValue(quantity: AssembledQuantity): number | undefined {
  const value = Number(quantity.value);
  return Number.isFinite(value) ? value : undefined;
}

function _isNumeric(text: string): boolean {
  return Number.isFinite(Number(normalizeCellValue(text)));
}

/** The coordinate the category axis runs along: y for bars, x for columns. */
function _categoryOfItem(item: TextItem, family: BarFamily): number {
  return family.orientation === "bar"
    ? item.y + item.height / 2
    : item.x + item.width / 2;
}

function _categoryOfLabel(label: AssembledLabel, family: BarFamily): number {
  return family.orientation === "bar" ? label.cy : label.cx;
}

function _categorySpan(bar: Bar, family: BarFamily): [number, number] {
  return family.orientation === "bar"
    ? [bar.bbox[1], bar.bbox[3]]
    : [bar.bbox[0], bar.bbox[2]];
}

function _categoryCenterOf(bar: Bar): number {
  return bar.categoryCenter;
}

function _barAt(category: number, family: BarFamily): Bar | undefined {
  return family.bars.find((bar) => {
    const [low, high] = _categorySpan(bar, family);
    return category >= low && category <= high;
  });
}

function _thickness(family: BarFamily): number {
  const first = family.bars[0];
  if (first === undefined) {
    return 0;
  }
  const [low, high] = _categorySpan(first, family);
  return high - low;
}

/**
 * Groups a region's bars, names and figures into category rows.
 *
 * Every bar is a row before any text is read, because a bar with no figure
 * beside it is the case this reader exists for. A name and a figure that line
 * up with each other on a row where nothing was drawn are a row too: a pillar
 * funded at zero has a name, a printed `0`, and nothing to draw.
 */
function _rows(
  family: BarFamily,
  labelItems: readonly TextItem[],
  quantities: readonly AssembledQuantity[],
): Row[] {
  const labels = assembleLabels(labelItems);
  const rowOf = new Map<Bar | number, Row>(
    family.bars.map((bar) => {
      return [
        bar,
        {
          label: "",
          bar,
          quantity: undefined,
          category: _categoryCenterOf(bar),
        },
      ];
    }),
  );
  const tolerance = Math.max(_thickness(family), 1) / 2;

  const rowAt = (category: number): Row => {
    const bar = _barAt(category, family);
    if (bar !== undefined) {
      return rowOf.get(bar)!;
    }
    const nearby = [...rowOf.keys()].find((key) => {
      return typeof key === "number" && Math.abs(key - category) <= tolerance;
    });
    const key = nearby ?? category;
    const row = rowOf.get(key) ?? {
      label: "",
      bar: undefined,
      quantity: undefined,
      category,
    };
    rowOf.set(key, row);
    return row;
  };

  labels.forEach((label) => {
    const row = rowAt(_categoryOfLabel(label, family));
    // The first name on a row wins it. A second one is an annotation printed
    // inside the plot, not a competing category.
    if (row.label === "") {
      row.label = label.text;
    }
  });
  quantities.forEach((quantity) => {
    const row = rowAt(_categoryOfItem(quantity.item, family));
    row.quantity ??= quantity;
  });

  return [...rowOf.values()].sort((left, right) => {
    return family.orientation === "bar"
      ? right.category - left.category
      : left.category - right.category;
  });
}

/** Numeric ticks printed along the value axis of a framed chart. */
function _axisScale(
  region: RegionGeometry,
  family: BarFamily,
): Omit<ValueScale, "source"> {
  const frame = findPlotFrame(region);
  if (frame === undefined) {
    return { ticks: [], consumed: [] };
  }
  const partition = partitionTextByFrame(region, frame);
  const items = (
    family.orientation === "bar" ? partition.xTicks : partition.yTicks
  ).filter((item) => {
    return _isNumeric(item.text);
  });
  return {
    ticks: items.map((item) => {
      return {
        position:
          family.orientation === "bar" ? item.x + item.width / 2 : item.y,
        value: Number(normalizeCellValue(item.text)),
      };
    }),
    consumed: items,
  };
}

/**
 * What the value axis is fitted through.
 *
 * A user's two points beat the document, the document's own axis beats the
 * figures printed on the bars, and the printed figures come last because a
 * chart that rounds 3,041,000 to `3M` calibrates to that rounding.
 */
function _valueScale(
  region: RegionGeometry,
  family: BarFamily,
  rows: readonly Row[],
  hints: readonly AxisTick[],
): ValueScale {
  if (hints.length >= 2) {
    return { source: "hints", ticks: hints, consumed: [] };
  }
  const axis = _axisScale(region, family);
  if (axis.ticks.length >= 2) {
    return { source: "axis", ...axis };
  }
  return {
    source: "labels",
    consumed: [],
    ticks: rows.flatMap((row) => {
      const value = row.quantity && _numericValue(row.quantity);
      return row.bar === undefined || value === undefined
        ? []
        : [{ position: row.bar.freeEdge, value }];
    }),
  };
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

type Reading = {
  value: string;
  unit: PdfValueUnit | undefined;
  bbox: BBox;
};

/**
 * What one row reports, and where it was read from.
 *
 * A printed figure is reported as printed. The calibration is not used to
 * overwrite it, because the document's own number is the better record of
 * what the chart means and our arithmetic is only as good as the fit. The
 * calibration's job on a labelled row is to check it; on an unlabelled row it
 * is the only reading there is.
 */
function _readingFor(
  row: Row,
  calibration: AxisCalibration | undefined,
): Reading | undefined {
  if (row.quantity !== undefined) {
    return {
      value: row.quantity.value,
      unit: row.quantity.unit,
      bbox: row.quantity.bbox,
    };
  }
  if (row.bar === undefined || calibration === undefined) {
    return undefined;
  }
  return {
    value: String(Math.round(applyCalibration(calibration, row.bar.freeEdge))),
    unit: "n",
    bbox: row.bar.bbox,
  };
}

/** How far a row's printed figure is from the length its bar was drawn at. */
function _residualOf(
  row: Row,
  calibration: AxisCalibration | undefined,
): number | undefined {
  const value = row.quantity && _numericValue(row.quantity);
  if (
    row.bar === undefined ||
    calibration === undefined ||
    value === undefined
  ) {
    return undefined;
  }
  const expected = invertCalibration(calibration, value);
  return expected === undefined
    ? undefined
    : Math.abs(expected - row.bar.freeEdge);
}

function _flagsFor(
  row: Row,
  rowIndex: number,
  calibration: AxisCalibration | undefined,
  source: TickSource,
): PdfCellFlag[] {
  if (row.bar !== undefined && row.label === "") {
    return [
      {
        rowIndex,
        columnIndex: 0,
        reason: "unmatched_label",
        detail:
          "This bar was measured but has no name beside it, so there is " +
          "nothing to say what it counts.",
      },
    ];
  }
  /*
   * A per-row disagreement is only worth reporting when the scale came from
   * somewhere other than these same figures. Fitted through the bar labels,
   * least squares spreads one wrong label's error across every row, and
   * flagging all of them would name the innocent as often as the guilty. That
   * case is reported once, about the chart.
   */
  const residual =
    source === "labels" ? undefined : _residualOf(row, calibration);
  if (residual === undefined || residual <= RESIDUAL_TOLERANCE) {
    return [];
  }
  return [
    {
      rowIndex,
      columnIndex: 1,
      reason: "high_residual",
      detail:
        `"${row.label}" is printed as ${row.quantity?.text ?? ""}, but its ` +
        `bar was drawn ${residual.toFixed(1)} pt from where that value ` +
        "belongs on the scale. Check it against the page.",
    },
  ];
}

function _regionFlags(
  calibration: AxisCalibration,
  scale: ValueScale,
): PdfCellFlag[] {
  if (calibration.maxResidual <= RESIDUAL_TOLERANCE) {
    return [];
  }
  return [
    {
      rowIndex: -1,
      columnIndex: -1,
      reason: "high_residual",
      detail:
        `The bars do not all sit on one scale: the best fit through ` +
        `${scale.ticks.length} of them is out by ` +
        `${calibration.maxResidual.toFixed(1)} pt. At least one bar and the ` +
        "figure printed against it disagree. Check them against the page.",
    },
  ];
}

/** Options for {@link readBarChart}. */
export type BarChartOptions = {
  regionId: string;
  /** Two or more (position, value) points on the value axis, from the user. */
  valueAxisHints?: readonly AxisTick[];
};

/**
 * Reads a bar or column chart from the rectangles it was drawn with.
 *
 * This exists because proximity pairing reads a bar chart by accident. The
 * OCHA funding chart's pillar names sit in a column 90 to 180 points left of
 * their own figures while the rows are 23 points apart, so five of its six
 * amounts were nearer some other pillar's name than a comfortable margin
 * allows, and all five were flagged as near-ties. A bar says which row it is
 * on, so the association stops being a distance contest.
 *
 * Values the chart printed are reported as printed, and the geometry is used
 * to check them. Only a bar with no figure beside it is read off the scale.
 *
 * Returns `undefined` when the region holds no bar family, or when nothing
 * calibrates the value axis and no figure is printed either, so the caller
 * falls through to reading the text.
 */
export function readBarChart(
  region: RegionGeometry,
  options: BarChartOptions,
): ExtractedTable | undefined {
  const family = findBarFamily(region);
  if (family === undefined) {
    return undefined;
  }
  const scaleText = _valueScale(
    region,
    family,
    [],
    options.valueAxisHints ?? [],
  );
  const { quantities, labelItems } = assembleQuantities(
    region.textItems.filter((item) => {
      return !scaleText.consumed.includes(item);
    }),
  );
  const rows = _rows(family, labelItems, quantities);
  const scale =
    scaleText.ticks.length >= 2
      ? scaleText
      : _valueScale(region, family, rows, options.valueAxisHints ?? []);
  const calibration = calibrateAxis(scale.ticks);

  const readable = rows.flatMap((row) => {
    const reading = _readingFor(row, calibration);
    return reading === undefined ? [] : [{ row, reading }];
  });
  if (readable.length === 0) {
    return undefined;
  }

  return {
    regionId: options.regionId,
    cells: [
      ["label", "value"],
      ...readable.map(({ row, reading }) => {
        return [row.label, reading.value];
      }),
    ],
    headerRows: 1,
    flags: [
      ...readable.flatMap(({ row }, rowIndex) => {
        return _flagsFor(row, rowIndex, calibration, scale.source);
      }),
      ...(calibration === undefined ? [] : _regionFlags(calibration, scale)),
    ],
    extractedBy: "rules",
    rowProvenance: readable.map(({ reading }) => {
      return { page: region.pageIndex, bbox: reading.bbox };
    }),
    rowUnits: readable.map(({ reading }) => {
      return reading.unit;
    }),
    ...(calibration === undefined
      ? {}
      : { chartAxis: _chartAxis(calibration, scale.ticks) }),
  };
}
