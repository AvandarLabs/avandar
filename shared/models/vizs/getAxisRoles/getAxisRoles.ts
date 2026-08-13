import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types.ts";

/**
 * Which kind of scale an axis uses. Minimum, maximum, and tick interval
 * are only meaningful on a `value` axis; a `category` axis places
 * discrete labels and has no numeric domain to bound.
 */
export type AxisRole = "category" | "value";

export type AxisRoles = { x: AxisRole; y: AxisRole };

const CATEGORY_X: AxisRoles = { x: "category", y: "value" };
const BOTH_VALUE: AxisRoles = { x: "value", y: "value" };
const NEITHER: AxisRoles = { x: "category", y: "category" };

/**
 * Exhaustive so that adding a viz type is a compile error here rather
 * than a silently wrong axis form.
 */
const AXIS_ROLES_BY_VIZ_TYPE: Record<VizType, AxisRoles> = {
  bar: CATEGORY_X,
  line: CATEGORY_X,
  area: CATEGORY_X,
  scatter: BOTH_VALUE,
  bubble: BOTH_VALUE,
  radar: NEITHER,
  pie: NEITHER,
  funnel: NEITHER,
  table: NEITHER,
};

/**
 * The axis roles for a viz type. Read by descriptor authoring (which
 * controls exist) and by `applyChartStyle` (whether to resolve a
 * numeric domain for an axis).
 *
 * Horizontal bar orientation will need bar's roles swapped to
 * `{ x: "value", y: "category" }`, which is why this is a lookup rather
 * than a hardcoded constant at each call site.
 */
export function getAxisRoles(vizType: VizType): AxisRoles {
  return AXIS_ROLES_BY_VIZ_TYPE[vizType];
}
