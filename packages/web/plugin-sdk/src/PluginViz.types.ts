import type {
  AvandarApi,
  PluginColumnDataType,
} from "@plugin-sdk/PluginApi.types";
import type { ComponentType } from "react";

/**
 * A value a chart setting holds: an option value, text, or a color as a
 * string, a number, or a switch's boolean. A column setting holds the
 * column's name.
 */
export type PluginVizSettingValue = string | number | boolean;

/**
 * What a plugin chart receives each time it draws: the query result rows,
 * the result's columns, and the settings chosen in the chart's settings
 * form. Both a transform and a chart component read it.
 */
export type PluginVizInput = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  columns: ReadonlyArray<
    Readonly<{ name: string; dataType: PluginColumnDataType }>
  >;
  /** Column settings arrive as column names. Unset settings are undefined. */
  settings: Readonly<Record<string, PluginVizSettingValue | undefined>>;
  /**
   * True when `rows` holds only the first part of the result, so a chart can
   * say that it was built from partial data.
   */
  isTruncated: boolean;
}>;

/**
 * What a transform receives besides its input: the plugin's translator and
 * the viewer's locale, for example to label an "Other" series or to format
 * a date.
 */
export type PluginVizContext = Readonly<{
  i18n: AvandarApi["i18n"];
  locale: string;
}>;

/**
 * The built-in chart a transform asks Avandar to draw from its output rows.
 * Avandar draws it as one of its own bar, line, or area charts.
 *
 * - `xColumn`: the output column on the x axis.
 * - `xColumnType`: `date` formats the x values as dates in the viewer's
 *   locale. Defaults to `category`.
 * - `series`: one entry per output column drawn as a series. A `label` is
 *   shown as written, so translate it with `i18n.t` first.
 * - `layout`: whether series sit side by side or stack. Defaults to `group`.
 * - `barGap`: `none` draws bars with no gap between categories, as a
 *   histogram does. Used by bar charts only.
 */
export type PluginChartSpec = Readonly<{
  kind: "bar" | "line" | "area";
  xColumn: string;
  xColumnType?: "category" | "date";
  series: ReadonlyArray<Readonly<{ column: string; label?: string }>>;
  layout?: "group" | "stack";
  barGap?: "default" | "none";
}>;

/** What a transform returns: the rows to chart and how to chart them. */
export type PluginVizTransformResult = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  chart: PluginChartSpec;
}>;

/**
 * Turns a chart's input into rows plus a built-in chart spec, for example
 * to bucket dates into an epidemic curve. A plugin declares it as a chart
 * type's `transform` in `definePlugin`. When it throws, Avandar shows an
 * error in the chart area instead of the chart.
 */
export type PluginVizTransform = (
  input: PluginVizInput,
  context: PluginVizContext,
) => PluginVizTransformResult;

/**
 * The props of a plugin chart component: the chart's input plus the width
 * and height, in pixels, of the area Avandar measured for it.
 */
export type PluginVizComponentProps = PluginVizInput &
  Readonly<{ width: number; height: number }>;

/**
 * How a plugin draws one chart type, keyed by the chart type's id in
 * `definePlugin`'s `vizTypes`. A `transform` hands Avandar rows and a chart
 * spec to draw. A `Component` draws the chart itself, for example with
 * `@avandar/plugin-ui/charts`. Use the one the manifest's `render` names.
 */
export type PluginVizDefinition =
  | Readonly<{ transform: PluginVizTransform; Component?: undefined }>
  | Readonly<{
      Component: ComponentType<PluginVizComponentProps>;
      transform?: undefined;
    }>;
