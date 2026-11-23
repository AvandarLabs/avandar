import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { PointAggregation } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";

/**
 * One layer of a published map: the features a viewer would draw, with the
 * layer's sensitivity policy already applied and its properties cut to what
 * its popup and paint read.
 */
export type MapSnapshotLayer = {
  layerId: MapLayer.Id;
  featureCollection: GeoJSON.FeatureCollection;

  /** Set when DuckDB aggregated the layer's points into cells. */
  aggregation: PointAggregation | undefined;
};

/**
 * A map's rendered output, frozen when a dashboard is published to the web.
 * A public page draws it without DuckDB and without the map's datasets.
 */
export type MapSnapshot = {
  version: 1;
  mapId: AvaMap.Id;
  mapName: string;

  /** The map's config with every layer's source query stripped. */
  config: AvaMapConfig.T;
  layers: readonly MapSnapshotLayer[];
};
