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

/** A bar series - renders as bars. */
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

/** A line series - renders as a polyline. */
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

/** An area series - renders as a filled region under a polyline. */
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
export type AvaXYSeries = AvaBarSeries | AvaLineSeries | AvaAreaSeries;

/**
 * A radar series. Radar does not compose with bar/line/area so there is
 * no `renderAs` discriminator - every radar series renders as a radar
 * polygon.
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
 * A scatter series - each carries its own X and Y columns since
 * scatter plots pair points, unlike bar/line/area which share an X
 * axis across all series.
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
 * A bubble series - like AvaScatterSeries plus a third column for radius.
 */
export type AvaBubbleSeries = AvaScatterSeries & {
  /** Column ID supplying the bubble size (radius). */
  sizeKey: QueryColumn.Id;
};
