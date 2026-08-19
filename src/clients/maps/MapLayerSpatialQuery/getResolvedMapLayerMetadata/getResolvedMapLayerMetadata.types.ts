import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** Inputs shared by every helper that resolves a layer's persisted refs. */
export type ResolveOptions = {
  layer: MapLayer.T;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
};

/** The geo bindings that resolve against a persisted boundary source. */
export type BoundaryBinding = Extract<
  MapLayer.GeoBinding,
  { type: "joinToBoundaries" | "aggregatePointsToBoundaries" }
>;
