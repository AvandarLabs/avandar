import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** One column offered as a disputed-status bind in the layer inspector. */
export type ColumnOption = {
  value: string;
  label: string;
  reference: MapLayer.DisputedStatusRef;
  /** Set only for a `geometryColumn` bind: added to the query if missing. */
  queryColumn: QueryColumn.T | undefined;
};
