import type {
  DatasetColumn, // prettier-ignore
} from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/**
 * Where a layer's disputed-status values come from.
 *
 * Boundary bindings read the status from the boundary dataset rather than the
 * point source, because the boundary is the thing whose line is disputed.
 */
export type DisputedStatusRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | { type: "boundaryColumn"; column: DatasetColumn.Id };

/**
 * Which source values mean disputed and which mean undetermined. The two
 * arrays must be disjoint. Every other value, including null and values absent
 * from the column, is settled.
 */
export type DisputedStatusValues = {
  disputed: readonly string[];
  undetermined: readonly string[];
};

/** How one feature's boundary line is drawn. */
export type DisputedStatus = "disputed" | "undetermined" | "settled";
