import { uuidType } from "$/lib/zodHelpers.ts";
import {
  AggregateOnlySensitivitySchema,
  ExactSensitivitySchema,
  JitterSensitivitySchema,
  LatLngColumnsBindingSchema,
  SingleColorSpecSchema,
  StrokeSpecSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  AreaAggregationSchema,
  AvaMapConfigV2Schema,
  BoundaryJoinBindingSchema,
  CircleSymbologySchema,
  FillSymbologySchema,
  GeometryColumnBindingSchema,
  LayerCommonShape,
  LegendSchema,
  LineSymbologySchema,
  PointAggregationBindingSchema,
  PointGeometryBindingSchema,
  ProportionalSymbolSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import { z } from "zod";

const V3GeometryColumnBindingSchema = GeometryColumnBindingSchema.extend({
  sourceCrs: z.number().int().positive().optional(),
}).strict();
const V3PointGeometryBindingSchema = PointGeometryBindingSchema.extend({
  sourceCrs: z.number().int().positive().optional(),
}).strict();
const V3PointBindingSchema = z.discriminatedUnion("type", [
  LatLngColumnsBindingSchema,
  V3PointGeometryBindingSchema,
]);
const V3PointAggregationBindingSchema = PointAggregationBindingSchema.extend({
  points: V3PointBindingSchema,
}).strict();
const GridBinBindingSchema = z.strictObject({
  type: z.literal("binPointsToGrid"),
  grid: z.enum(["hex", "square"]),
  sizeMeters: z.number().min(100).max(1_000_000),
  points: V3PointBindingSchema,
  aggregation: AreaAggregationSchema,
});

/** Version 3 geo binding, including optional source CRS and grid bins. */
export const V3GeoBindingSchema = z.discriminatedUnion("type", [
  LatLngColumnsBindingSchema,
  V3GeometryColumnBindingSchema,
  BoundaryJoinBindingSchema,
  V3PointAggregationBindingSchema,
  GridBinBindingSchema,
]);

const V3PolygonGeometryBindingSchema = V3GeometryColumnBindingSchema.extend({
  family: z.literal("polygon"),
}).strict();
/** Version 3 area geo binding, including optional source CRS and grid bins. */
export const V3AreaGeoBindingSchema = z.discriminatedUnion("type", [
  V3PolygonGeometryBindingSchema,
  BoundaryJoinBindingSchema,
  V3PointAggregationBindingSchema,
  GridBinBindingSchema,
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
const V3SymbologySchema = z.discriminatedUnion("type", [
  CircleSymbologySchema,
  ProportionalSymbolSchema,
  LineSymbologySchema,
  FillSymbologySchema,
  ClusterSymbologySchema,
  HeatmapSymbologySchema,
]);

const V3LegendSchema = LegendSchema.extend({
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
const V3LayerCommonShape = {
  ...LayerCommonShape,
  legend: V3LegendSchema,
} as const;
const V3StandardLayerSchema = z.strictObject({
  ...V3LayerCommonShape,
  geoBinding: V3GeoBindingSchema.optional(),
  symbology: V3SymbologySchema,
  sensitivity: z.discriminatedUnion("mode", [
    ExactSensitivitySchema,
    JitterSensitivitySchema,
  ]),
});
const V3AggregateOnlyLayerSchema = z.strictObject({
  ...V3LayerCommonShape,
  geoBinding: V3AreaGeoBindingSchema.optional(),
  symbology: FillSymbologySchema,
  sensitivity: AggregateOnlySensitivitySchema,
});
const V3LayerSchema = z.union([
  V3StandardLayerSchema,
  V3AggregateOnlyLayerSchema,
]);

/** Version 3 persisted map configuration. */
export const AvaMapConfigV3Schema = AvaMapConfigV2Schema.extend({
  version: z.literal(3),
  layers: z.array(V3LayerSchema).readonly(),
}).strict();
