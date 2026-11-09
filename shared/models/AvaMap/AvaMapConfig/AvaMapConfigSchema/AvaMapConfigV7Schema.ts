import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import {
  V3AreaGeoBindingSchema,
  V3GeoBindingSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import {
  AvaMapConfigV6Schema,
  V6AggregateOnlyLayerSchema,
  V6StandardLayerSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts";
import { BUFFER_DISTANCE_UNITS } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/** Buffer rings that remember their typed unit and an optional ring label. */
export const V7BufferOfLayerBindingSchema = z.strictObject({
  type: z.literal("bufferOfLayer"),
  layerId: uuidType<"MapLayer">(),
  distanceMeters: z.number().min(100).max(1_000_000),
  distanceUnit: z.enum(BUFFER_DISTANCE_UNITS),
  labelColumn: uuidType<"QueryColumn">().optional(),
  dissolve: z.boolean(),
});

const V7GeoBindingSchema = z.union([
  V3GeoBindingSchema,
  V7BufferOfLayerBindingSchema,
]);

const V7AreaGeoBindingSchema = z.union([
  V3AreaGeoBindingSchema,
  V7BufferOfLayerBindingSchema,
]);

/** Another layer whose polygons a layer's features must intersect. */
const SpatialFilterSchema = z.strictObject({
  layerId: uuidType<"MapLayer">(),
});

/** Version 7 layer with full point, line, and polygon symbology. */
export const V7StandardLayerSchema = V6StandardLayerSchema.extend({
  geoBinding: V7GeoBindingSchema.optional(),
  spatialFilter: SpatialFilterSchema.optional(),
}).strict();

/** Version 7 layer restricted to aggregate-only fill paint. */
export const V7AggregateOnlyLayerSchema = V6AggregateOnlyLayerSchema.extend({
  geoBinding: V7AreaGeoBindingSchema.optional(),
  spatialFilter: SpatialFilterSchema.optional(),
}).strict();

/**
 * Version 7 layer: buffers carry a typed unit and an optional ring label, and
 * any layer may be filtered to another layer's polygons.
 */
export const AvaMapConfigV7LayerSchema = z.union([
  V7StandardLayerSchema,
  V7AggregateOnlyLayerSchema,
]);

/** Version 7 persisted map configuration. */
export const AvaMapConfigV7Schema = AvaMapConfigV6Schema.extend({
  version: z.literal(7),
  layers: z.array(AvaMapConfigV7LayerSchema).readonly(),
}).strict();
