import { z } from "zod";

import { uuidType } from "$/lib/zodHelpers.ts";
import {
  AggregateOnlySensitivitySchema,
  BasemapSchema,
  BookmarkSchema,
  ExactSensitivitySchema,
  JitterSensitivitySchema,
  SingleColorSpecSchema,
  StrokeSpecSchema,
  ViewStateSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  CircleSymbologySchema,
  FillSymbologySchema,
  LayerCommonShape,
  LegendSchema,
  LineSymbologySchema,
  ProportionalSymbolSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import {
  V3AreaGeoBindingSchema,
  V3GeoBindingSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";

/** Polygon rings produced by buffering another layer's features. */
export const BufferOfLayerBindingSchema = z.strictObject({
  type: z.literal("bufferOfLayer"),
  layerId: uuidType<"MapLayer">(),
  distanceMeters: z.number().min(100).max(1_000_000),
  dissolve: z.boolean(),
});

/** Version 4 geo binding, including buffer-of-layer. */
export const V4GeoBindingSchema = z.union([
  V3GeoBindingSchema,
  BufferOfLayerBindingSchema,
]);

/** Version 4 area geo binding, including buffer-of-layer. */
export const V4AreaGeoBindingSchema = z.union([
  V3AreaGeoBindingSchema,
  BufferOfLayerBindingSchema,
]);

const ClusterSymbologySchema = z.strictObject({
  type: z.literal("cluster"),
  radiusPx: z.number(),
  color: SingleColorSpecSchema,
  stroke: StrokeSpecSchema,
});
const HeatmapSymbologySchema = z.strictObject({
  type: z.literal("heatmap"),
  radiusPx: z.number(),
  weight: uuidType<"QueryColumn">().optional(),
  ramp: z.array(z.string()).readonly(),
});
const V4SymbologySchema = z.discriminatedUnion("type", [
  CircleSymbologySchema,
  ProportionalSymbolSchema,
  LineSymbologySchema,
  FillSymbologySchema,
  ClusterSymbologySchema,
  HeatmapSymbologySchema,
]);

const V4LegendSchema = LegendSchema.extend({
  sizeStops: z
    .array(
      z.strictObject({
        value: z.number(),
        radiusPx: z.number(),
        label: z.string(),
      }),
    )
    .readonly(),
}).strict();

/** Fields shared by every version 4 layer variant. */
export const V4LayerCommonShape = {
  ...LayerCommonShape,
  legend: V4LegendSchema,
  timeColumn: uuidType<"QueryColumn">().optional(),
  applyAoiFilter: z.boolean(),
} as const;

/** A version 4 layer with full point/line/polygon symbology. */
export const V4StandardLayerSchema = z.strictObject({
  ...V4LayerCommonShape,
  geoBinding: V4GeoBindingSchema.optional(),
  symbology: V4SymbologySchema,
  sensitivity: z.discriminatedUnion("mode", [
    ExactSensitivitySchema,
    JitterSensitivitySchema,
  ]),
});
/** A version 4 layer restricted to aggregate-only fill paint. */
export const V4AggregateOnlyLayerSchema = z.strictObject({
  ...V4LayerCommonShape,
  geoBinding: V4AreaGeoBindingSchema.optional(),
  symbology: FillSymbologySchema,
  sensitivity: AggregateOnlySensitivitySchema,
});
const V4LayerSchema = z.union([
  V4StandardLayerSchema,
  V4AggregateOnlyLayerSchema,
]);

const PositionSchema = z.tuple([z.number(), z.number()]);

/** One WGS 84 GeoJSON Polygon used as the map's area of interest. */
export const AoiPolygonSchema = z.strictObject({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(PositionSchema).readonly()).readonly(),
});

/** Inclusive ISO-8601 instants; `end` must not precede `start`. */
export const TimeRangeSchema = z
  .strictObject({
    start: z.string(),
    end: z.string(),
  })
  .refine((range) => {
    return range.end >= range.start;
  });

const [textKind, arrowKind, freehandKind, areaKind] =
  AvaMapConfigValues.annotationKinds;

const AnnotationFeatureSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal(textKind),
    id: uuidType<"AnnotationFeature">(),
    geometry: z.strictObject({
      type: z.literal("Point"),
      coordinates: PositionSchema,
    }),
    text: z.string(),
    sizePx: z.number(),
    color: z.string(),
  }),
  z.strictObject({
    kind: z.literal(arrowKind),
    id: uuidType<"AnnotationFeature">(),
    geometry: z.strictObject({
      type: z.literal("LineString"),
      coordinates: z.tuple([PositionSchema, PositionSchema]),
    }),
    color: z.string(),
    strokeWidthPx: z.number(),
  }),
  z.strictObject({
    kind: z.literal(freehandKind),
    id: uuidType<"AnnotationFeature">(),
    geometry: z.strictObject({
      type: z.literal("LineString"),
      coordinates: z.array(PositionSchema).readonly(),
    }),
    color: z.string(),
    strokeWidthPx: z.number(),
  }),
  z.strictObject({
    kind: z.literal(areaKind),
    id: uuidType<"AnnotationFeature">(),
    geometry: AoiPolygonSchema,
    color: z.string(),
    opacity: z.number(),
    stroke: z.strictObject({
      color: z.string(),
      widthPx: z.number(),
    }),
  }),
]);

/** Visibility and drawn features for the map's annotation overlay. */
export const AnnotationLayerSchema = z.strictObject({
  isVisible: z.boolean(),
  features: z.array(AnnotationFeatureSchema).readonly(),
});

/** Version 4 persisted map configuration. */
export const AvaMapConfigV4Schema = z.strictObject({
  __type: z.literal("AvaMapConfig"),
  version: z.literal(4),
  basemap: BasemapSchema,
  view: ViewStateSchema,
  bookmarks: z.array(BookmarkSchema).readonly(),
  layers: z.array(V4LayerSchema).readonly(),
  aoi: AoiPolygonSchema.optional(),
  timeRange: TimeRangeSchema.optional(),
  annotations: AnnotationLayerSchema,
  annotationsZIndex: z.number().int().min(0),
});
