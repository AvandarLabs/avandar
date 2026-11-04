import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
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

/**
 * A series drawn as bars in an `AvaVizConfig` bar, line, or area chart, keyed
 * by column ID. Renderers take the `BarSeries` form, keyed by `QueryResult`
 * column name.
 */
export type AvaBarSeries = {
  renderAs: "bar";

  /** Column ID supplying the bar's values. */
  key: QueryColumn.Id;

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

/**
 * A series drawn as a line in an `AvaVizConfig` bar, line, or area chart,
 * keyed by column ID. Renderers take the `LineSeries` form, keyed by
 * `QueryResult` column name.
 */
export type AvaLineSeries = {
  renderAs: "line";

  /** Column ID supplying the line's Y values. */
  key: QueryColumn.Id;

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

/**
 * A series drawn as a filled region under a line in an `AvaVizConfig` bar,
 * line, or area chart, keyed by column ID. Renderers take the `AreaSeries`
 * form, keyed by `QueryResult` column name.
 */
export type AvaAreaSeries = {
  renderAs: "area";

  /** Column ID supplying the area's Y values. */
  key: QueryColumn.Id;

  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;

  /** Optional CSS color override. */
  color?: string;

  /** Curve interpolation. Defaults to the chart's curve style. */
  curveType?: CurveType;

  /** Stroke width of the top edge. Defaults to `2`. */
  strokeWidth?: number;

  /** Fill opacity in `[0, 1]`. Defaults to `0.6` in an area chart. */
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
export type AvaXYSeries = AvaBarSeries | AvaLineSeries | AvaAreaSeries;

/**
 * A polygon in an `AvaVizConfig` radar chart, keyed by column ID. Radar does
 * not compose with bar, line, or area, so there is no `renderAs`
 * discriminator. Renderers take the `RadarSeries` form, keyed by
 * `QueryResult` column name.
 */
export type AvaRadarSeries = {
  /** Column ID supplying the radial values. */
  key: QueryColumn.Id;

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
 * A point cloud in an `AvaVizConfig` scatter plot, keyed by column ID. Each
 * series carries its own X and Y columns since scatter plots pair points,
 * unlike bar, line, and area charts, whose series share one X axis.
 * Renderers take the `ScatterSeries` form, keyed by `QueryResult` column name.
 */
export type AvaScatterSeries = {
  /** Column ID supplying the Y values. */
  key: QueryColumn.Id;
  /** Column ID supplying the X values. */
  xKey: QueryColumn.Id;
  /** Optional override for the series label shown in legend/tooltip. */
  label?: string;
  /** Optional CSS color override. */
  color?: string;
};

/**
 * A bubble cloud in an `AvaVizConfig` bubble chart: an `AvaScatterSeries` plus
 * a third column ID for each bubble's radius. Renderers take the
 * `BubbleSeries` form, keyed by `QueryResult` column name.
 */
export type AvaBubbleSeries = AvaScatterSeries & {
  /** Column ID supplying the bubble size (radius). */
  sizeKey: QueryColumn.Id;
};
