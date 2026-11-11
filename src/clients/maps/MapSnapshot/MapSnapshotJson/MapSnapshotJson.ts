import { isPlainObject } from "@avandar/utils";
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const FeatureCollectionSchema = z.custom<GeoJSON.FeatureCollection>((value) => {
  return (
    isPlainObject(value) &&
    value.type === "FeatureCollection" &&
    Array.isArray(value.features)
  );
});

const PointAggregationSchema = z.object({
  cellsAcross: z.number(),
  aggregatedRowCount: z.number(),
  didCoarsenGrid: z.boolean(),
});

const MapSnapshotFileSchema = z.object({
  version: z.literal(1),
  mapId: uuidType<AvaMap.Id>(),
  mapName: z.string(),
  config: z.unknown(),
  layers: z.array(
    z.object({
      layerId: uuidType<MapLayer.Id>(),
      featureCollection: FeatureCollectionSchema,
      aggregation: PointAggregationSchema.optional(),
    }),
  ),
});

function _toJson(snapshot: Readonly<MapSnapshot>): string {
  return JSON.stringify({
    ...snapshot,
    config: AvaMapConfigSchema.toJson(snapshot.config),
  });
}

function _fromJson(text: string): MapSnapshot {
  const parsed = MapSnapshotFileSchema.parse(JSON.parse(text));
  return {
    version: parsed.version,
    mapId: parsed.mapId,
    mapName: parsed.mapName,
    config: AvaMapConfigSchema.fromJson(parsed.config),
    layers: parsed.layers.map((layer) => {
      return {
        layerId: layer.layerId,
        featureCollection: layer.featureCollection,
        aggregation: layer.aggregation,
      };
    }),
  };
}

/** Reads and writes the JSON file a published map snapshot is stored as. */
export const MapSnapshotJson = {
  /** Serializes a snapshot, its config through the map config schema. */
  toJson: _toJson,

  /** Validates a stored snapshot and migrates its config to the current one. */
  fromJson: _fromJson,
};
