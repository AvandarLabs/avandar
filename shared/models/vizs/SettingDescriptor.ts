/**
 * # Setting vs. control — viz settings nomenclature
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
 * them together: it points to a setting (a typed `Paths<TConfig>` key),
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

// ---------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------

/**
 * `true` if `T` is a plain object (not a primitive, not an array, not a
 * function). Used to gate recursion into nested fields.
 */
type _IsPlainObject<T> =
  T extends readonly unknown[] ? false
  : T extends (...args: never[]) => unknown ? false
  : T extends object ? true
  : false;

/**
 * Recursively enumerate every dotted path through `T`. Stops at
 * primitives, arrays, and functions; arrays are treated as opaque
 * (series are addressed by index in the form layer, not via paths).
 *
 * Optional fields are unwrapped via `NonNullable` so a path like
 * `"chartStyle.xAxis.labelColor"` is reachable even when each level is
 * optional.
 *
 * For union types, paths are distributed so `Paths<A | B>` yields paths
 * reachable through either variant.
 */
export type Paths<T> =
  T extends unknown ?
    T extends object ?
      {
        [K in Extract<keyof T, string>]: _IsPlainObject<
          NonNullable<T[K]>
        > extends true ?
          K | `${K}.${Paths<NonNullable<T[K]>>}`
        : K;
      }[Extract<keyof T, string>]
    : never
  : never;

/** Resolve the value type at a given dotted path. */
export type PathValue<T, P extends string> =
  T extends unknown ?
    P extends `${infer K}.${infer Rest}` ?
      K extends keyof T ?
        PathValue<NonNullable<T[K]>, Rest>
      : never
    : P extends keyof T ? T[P]
    : never
  : never;

/**
 * Read the value at a dotted path. Returns `undefined` if any segment
 * along the way is `undefined` / `null` or not an object.
 */
export function pathGet<T, P extends Paths<T> & string>(
  obj: T,
  path: P,
): PathValue<T, P> | undefined {
  const segments = path.split(".");
  let curr: unknown = obj;
  for (const seg of segments) {
    if (curr === undefined || curr === null || typeof curr !== "object") {
      return undefined;
    }
    curr = (curr as Record<string, unknown>)[seg];
  }
  return curr as PathValue<T, P> | undefined;
}

/**
 * Immutably set the value at a dotted path. Intermediate objects are
 * created as needed. Passing `undefined` clears the leaf field. The
 * original object is not mutated.
 */
export function pathSet<T, P extends Paths<T> & string>(
  obj: T,
  path: P,
  value: PathValue<T, P> | undefined,
): T {
  const segments = path.split(".");
  return _pathSetRec(obj, segments, value) as T;
}

function _pathSetRec(
  source: unknown,
  segments: readonly string[],
  value: unknown,
): unknown {
  if (segments.length === 0) {
    return value;
  }
  const [head, ...rest] = segments;
  if (head === undefined) {
    return value;
  }
  const base =
    source !== null && typeof source === "object" && !Array.isArray(source) ?
      (source as Record<string, unknown>)
    : {};
  return { ...base, [head]: _pathSetRec(base[head], rest, value) };
}

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
  key: Paths<TConfig> & string;
  /** Label shown next to the control in the form. */
  label: string;
  /** Optional group header used to cluster related settings. */
  group?: string;
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
  key: Paths<TSeries> & string;
  /** Label shown next to the control in the form. */
  label: string;
  /** Optional group header used to cluster related settings. */
  group?: string;
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
 * The form layer reads descriptors through {@link ErasedVizSettingDescriptors}
 * (a type-erased view) so it can iterate them without knowing the
 * concrete config or series shapes.
 */
export type VizSettingDescriptors<TConfig, TSeries> = {
  chart: ReadonlyArray<ChartSettingDescriptor<TConfig>>;
  series: ReadonlyArray<SeriesSettingDescriptor<TSeries>>;
};

/**
 * Type-erased descriptor pair, used at the registry / form-dispatch
 * boundary where the concrete `TConfig` and `TSeries` are unknown.
 */
export type ErasedChartSettingDescriptor = {
  key: string;
  label: string;
  group?: string;
  control: ControlSpec;
};

export type ErasedSeriesSettingDescriptor = {
  key: string;
  label: string;
  group?: string;
  control: ControlSpec;
  composable: boolean;
  appliesTo: RenderAs | "radar";
};

export type ErasedVizSettingDescriptors = {
  chart: readonly ErasedChartSettingDescriptor[];
  series: readonly ErasedSeriesSettingDescriptor[];
};

/**
 * Empty descriptor registry. Used by viz modules that have not yet
 * been refactored to use the descriptor-driven form (single-series
 * vizs like pie, funnel, scatter, bubble, table). Their forms remain
 * hand-coded for now; phase 2 will migrate them.
 */
export const EMPTY_VIZ_SETTING_DESCRIPTORS: ErasedVizSettingDescriptors = {
  chart: [],
  series: [],
};
