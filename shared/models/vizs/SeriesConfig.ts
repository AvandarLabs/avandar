import type { CurveType } from "$/models/vizs/CurveType.ts";

/**
 * Mark types that a single series can render as inside an XY chart host
 * (bar / line / area). A line series can live inside a bar host (and vice
 * versa); the host dispatches to a composite renderer when any series's
 * `renderAs` differs from its own `vizType`.
 */
export type RenderAs = "bar" | "line" | "area";

/** Default fill opacity used when seeding a new area series. */
export const DEFAULT_AREA_FILL_OPACITY = 0.6;

/** A bar series — renders as bars. */
export type BarSeries = {
  renderAs: "bar";

  /** Column name supplying the bar's values. */
  key: string;

  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;

  /** Optional CSS color override (e.g. `"#ff0000"`). */
  color?: string;

  /**
   * Fill opacity in `[0, 1]`. When undefined, the renderer's default is
   * used (typically `1`).
   */
  fillOpacity?: number;

  /**
   * Stack identifier. Series that share a `stackId` are stacked in the
   * same column. Mantine BarChart "stack" / "percent" layouts ignore
   * this field (everything stacks into one column).
   */
  stackId?: string;
};

/** A line series — renders as a polyline. */
export type LineSeries = {
  renderAs: "line";

  /** Column name supplying the line's Y values. */
  key: string;

  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;

  /** Optional CSS color override. */
  color?: string;

  /** Curve interpolation. Defaults to the chart's curve style. */
  curveType?: CurveType;

  /** Stroke width in CSS pixels. Defaults to `2`. */
  strokeWidth?: number;

  /** Show dot markers at each data point. */
  withDots?: boolean;
};

/** An area series — renders as a filled region under a polyline. */
export type AreaSeries = {
  renderAs: "area";

  /** Column name supplying the area's Y values. */
  key: string;

  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;

  /** Optional CSS color override. */
  color?: string;

  /** Curve interpolation. Defaults to the chart's curve style. */
  curveType?: CurveType;

  /** Stroke width of the top edge. Defaults to `2`. */
  strokeWidth?: number;

  /** Fill opacity in `[0, 1]`. Defaults to ~`0.2`. */
  fillOpacity?: number;

  /** Show dot markers at each data point. */
  withDots?: boolean;
};

/**
 * Any series that can appear in an XY chart (bar / line / area host).
 * Series are discriminated by `renderAs`, which can differ from the
 * host's `vizType` (the renderer falls back to a composite chart in
 * that case).
 */
export type XYSeries = BarSeries | LineSeries | AreaSeries;

/**
 * A radar series. Radar does not compose with bar/line/area so there is
 * no `renderAs` discriminator — every radar series renders as a radar
 * polygon.
 */
export type RadarSeries = {
  /** Column name supplying the radial values. */
  key: string;

  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;

  /** Optional CSS color override. */
  color?: string;

  /** Stroke width of the polygon edge. Defaults to `2`. */
  strokeWidth?: number;

  /** Fill opacity in `[0, 1]`. Defaults to ~`0.2`. */
  fillOpacity?: number;
};

/**
 * A scatter series — each carries its own X and Y columns since
 * scatter plots pair points, unlike bar/line/area which share an X
 * axis across all series.
 */
export type ScatterSeries = {
  /** Column name supplying the Y values. */
  key: string;
  /** Column name supplying the X values. */
  xKey: string;
  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;
  /** Optional CSS color override. */
  color?: string;
};

/**
 * A bubble series — like ScatterSeries plus a third column for radius.
 */
export type BubbleSeries = ScatterSeries & {
  /** Column name supplying the bubble size (radius). */
  sizeKey: string;
};

/**
 * Convert an XY series from one mark type to another, preserving
 * fields that are common across mark types (`key`, `label`, `color`)
 * and resetting mark-specific fields to type-appropriate defaults.
 *
 * Used by `convertVizConfig` when the user changes the host viz type
 * (e.g. bar -> line), so existing series flip their default render
 * mode without manual reassignment.
 */
export function convertSeriesRenderAs(
  series: XYSeries,
  newRenderAs: RenderAs,
): XYSeries {
  const { key, label, color } = series;
  switch (newRenderAs) {
    case "bar":
      return { renderAs: "bar", key, label, color };
    case "line":
      return { renderAs: "line", key, label, color };
    case "area":
      return {
        renderAs: "area",
        key,
        label,
        color,
        fillOpacity: DEFAULT_AREA_FILL_OPACITY,
      };
  }
}
