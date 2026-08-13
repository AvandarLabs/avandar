import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";

/**
 * Which kind of scale an axis uses. Minimum, maximum, and tick interval
 * are only meaningful on a `value` axis; a `category` axis places
 * discrete labels and has no numeric domain to bound.
 */
export type AxisRole = "category" | "value";

/** The scale roles assigned to the X and Y axes. */
export type AxisRoles = { x: AxisRole; y: AxisRole };

const CATEGORY_X = {
  x: "category",
  y: "value",
} as const satisfies AxisRoles;
const BOTH_VALUE = {
  x: "value",
  y: "value",
} as const satisfies AxisRoles;
const NEITHER = {
  x: "category",
  y: "category",
} as const satisfies AxisRoles;

/**
 * Exhaustive so that adding a viz type is a compile error here rather
 * than a silently wrong axis form.
 */
const AXIS_ROLES_BY_VIZ_TYPE = {
  bar: CATEGORY_X,
  line: CATEGORY_X,
  area: CATEGORY_X,
  scatter: BOTH_VALUE,
  bubble: BOTH_VALUE,
  radar: NEITHER,
  pie: NEITHER,
  funnel: NEITHER,
  table: NEITHER,
} as const satisfies Record<VizConfig.Type, AxisRoles>;

/** Returns the X and Y axis roles for a visualization type. */
export function getAxisRoles(vizType: VizConfig.Type): AxisRoles {
  return { ...AXIS_ROLES_BY_VIZ_TYPE[vizType] };
}
