/**
 * # Setting vs. control: viz settings nomenclature
 *
 * The viz layer makes a deliberate, consistent distinction between
 * **settings** and **controls**. Use these terms everywhere: in code,
 * tests, comments, and documentation.
 *
 * - **Setting**: a configurable property on a viz config — the persisted
 *   data field. Identified by a typed dotted path into the config
 *   object: `color`, `curveType`, `chartStyle.xAxis.labelColor`. A
 *   setting is "what the user changes".
 *
 * - **Control**: the UI widget the form uses to edit a setting — a
 *   `ColorInput`, `Switch`, `SegmentedControl`, `NumberInput`. A control
 *   is "what the user uses to change it".
 *
 * Every setting maps to exactly one control. A `SettingDescriptor` binds
 * them together: it points to a setting (a typed `ObjectPaths<TConfig>` key),
 * declares the {@link ControlSpec} that should render it, and carries
 * metadata such as `label`, `group`, and (for series-level settings)
 * `composable`.
 *
 * Don't conflate the two. A `Switch` is never called a "setting", and a
 * `withLegend` field is never called a "control". When you talk about
 * "the curve type setting" you mean the persisted `curveType` field;
 * when you talk about "the curve type control" you mean the segmented
 * control widget the user clicks.
 */
import type { RenderAs } from "$/models/vizs/SeriesConfig.ts";
import type { ObjectPaths } from "@avandar/utils";

/**
 * The groups a setting can be clustered under in a settings form.
 *
 * These are stable identifiers, not display copy: forms group and compare on
 * them, so they must not change with the active locale. Render them through
 * `vizSettingGroupLabel` from `$/copy/vizSettingGroupLabel.ts`.
 */
export type VizSettingGroup =
  | "X axis"
  | "Y axis"
  | "Category axis"
  | "Legend"
  | "Style"
  | "Layout"
  | "Grid"
  | "Identity";

// ---------------------------------------------------------------------
// Control specifications
// ---------------------------------------------------------------------

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
};

/** Color picker (Mantine `ColorInput`). */
export type ColorControlSpec = {
  kind: "color";
  swatches?: readonly string[];
};

/** Boolean toggle (Mantine `Switch`). */
export type SwitchControlSpec = { kind: "switch" };

/** Pill-segmented choice (Mantine `SegmentedControl`). Best for ≤4 options. */
export type SegmentedControlSpec = {
  kind: "segmented";
  options: readonly SelectOption[];
};

/** Dropdown select (Mantine `Select`). Best for >4 options. */
export type SelectControlSpec = {
  kind: "select";
  options: readonly SelectOption[];
};

/** Numeric input (Mantine `NumberInput`). */
export type NumberControlSpec = {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

/** Free-form text input (Mantine `TextInput`). */
export type TextControlSpec = {
  kind: "text";
  placeholder?: string;
};

/**
 * Column picker — a {@link SelectControlSpec} whose options are derived
 * at render time from the query result columns. The optional
 * `dataType` filter narrows the dropdown (e.g. `"numeric"` for a Y
 * axis or series key).
 */
export type ColumnPickerControlSpec = {
  kind: "columnPicker";
  dataType?: "numeric" | "any" | "temporal" | "text";
};

export type ControlSpec =
  | ColorControlSpec
  | SwitchControlSpec
  | SegmentedControlSpec
  | SelectControlSpec
  | NumberControlSpec
  | TextControlSpec
  | ColumnPickerControlSpec;

// ---------------------------------------------------------------------
// Setting descriptors
// ---------------------------------------------------------------------

/**
 * Descriptor for a chart-level setting. Chart-level settings always
 * appear in the host viz's form. They never carry over when a series
 * embedded inside this host has a different `renderAs`.
 */
export type ChartSettingDescriptor<TConfig> = {
  /** Typed dotted path into the viz config. */
  key: ObjectPaths<TConfig> & string;
  /** Label shown next to the control in the form. */
  label: string;
  /** Optional group used to cluster related settings. */
  group?: VizSettingGroup;
  /** Which UI widget renders this setting. */
  control: ControlSpec;
};

/**
 * Descriptor for a series-level setting. Series-level settings appear
 * per-series in the form. When a series is embedded inside a host viz
 * with a different `vizType`, only descriptors with
 * `composable: true` are shown.
 */
export type SeriesSettingDescriptor<TSeries> = {
  /** Typed dotted path into the series object. */
  key: ObjectPaths<TSeries> & string;
  /** Label shown next to the control in the form. */
  label: string;
  /** Optional group used to cluster related settings. */
  group?: VizSettingGroup;
  /** Which UI widget renders this setting. */
  control: ControlSpec;
  /**
   * Whether this setting should still be exposed when this series is
   * embedded inside a host viz of a different type. Mark-level
   * settings (color, curve, stroke width) should be `true`; settings
   * that only make sense in the originating chart's context should be
   * `false`.
   */
  composable: boolean;
  /**
   * Which `renderAs` this descriptor applies to. Self-documenting and
   * doubles as a sanity check at form-dispatch time.
   */
  appliesTo: RenderAs | "radar";
};

/**
 * The full descriptor registry for a viz type. Each per-viz module
 * (BarChartVizConfigs, LineChartVizConfigs, etc.) exports one of
 * these.
 *
 * The form layer reads descriptors through {@link AnyVizSettingDescriptors}
 * (a type-erased view) so it can iterate them without knowing the
 * concrete config or series shapes.
 */
export type VizSettingDescriptors<TConfig, TSeries> = {
  chart: ReadonlyArray<ChartSettingDescriptor<TConfig>>;
  series: ReadonlyArray<SeriesSettingDescriptor<TSeries>>;
};

/**
 * Generic (un-parameterized) descriptor pair, used at the registry /
 * form-dispatch boundary where the concrete `TConfig` and `TSeries` are
 * unknown.
 */
export type AnyChartSettingDescriptor = {
  key: string;
  label: string;
  group?: VizSettingGroup;
  control: ControlSpec;
};

export type AnySeriesSettingDescriptor = {
  key: string;
  label: string;
  group?: VizSettingGroup;
  control: ControlSpec;
  composable: boolean;
  appliesTo: RenderAs | "radar";
};

export type AnyVizSettingDescriptors = {
  chart: readonly AnyChartSettingDescriptor[];
  series: readonly AnySeriesSettingDescriptor[];
};

/** Empty descriptor registry for pie, funnel, and table modules. */
export const EMPTY_VIZ_SETTING_DESCRIPTORS: AnyVizSettingDescriptors = {
  chart: [],
  series: [],
};
