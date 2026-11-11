import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** What the buffer tool asks to insert when the author confirms. */
export type BufferConfirmOptions = {
  distanceMeters: number;
  distanceUnit: MapLayer.BufferDistanceUnit;
  dissolve: boolean;
  labelColumn: QueryColumn.Id | undefined;
};

/** The point layer the author chose to filter by the buffer just added. */
export type FilterByBufferOptions = {
  bufferLayerId: MapLayer.Id;
  targetLayerId: MapLayer.Id;
};

/** A source column offered as a ring label. */
export type BufferLabelColumnOption = { value: QueryColumn.Id; label: string };
