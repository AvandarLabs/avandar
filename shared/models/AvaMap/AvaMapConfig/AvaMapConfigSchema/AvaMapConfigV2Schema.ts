import { uuidType } from "$/lib/zodHelpers.ts";
import {
  AggregateOnlySensitivitySchema,
  BasemapSchema,
  BookmarkSchema,
  ExactSensitivitySchema,
  JitterSensitivitySchema,
  LatLngColumnsBindingSchema,
  PopupSchema,
  SingleColorSpecSchema,
  StrokeSpecSchema,
  StructuredQuerySchema,
  V1LegendSchema,
  ViewStateSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  AUTOMATIC_CLASSIFICATION_METHODS,
  GEOMETRY_ENCODINGS,
  GEOMETRY_FAMILIES,
  LEGEND_ENTRY_TYPES,
} from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { z } from "zod";

const GeometryEncodingSchema = z.enum(GEOMETRY_ENCODINGS);
const GeometrySimplificationSchema = z.strictObject({
  tolerancePixels: z.number().min(0),
});
const AreaAggregationOutputIdSchema = uuidType<"AreaAggregationOutput">();

/** Count or measure rolled up into an area feature. */
export const AreaAggregationSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    operation: z.literal("count"),
    outputValueId: AreaAggregationOutputIdSchema,
  }),
  ...(["sum", "avg", "min", "max"] as const).map((operation) => {
    return z.strictObject({
      operation: z.literal(operation),
      measureColumn: uuidType<"QueryColumn">(),
      outputValueId: AreaAggregationOutputIdSchema,
    });
  }),
]);

const BoundarySourceSchema = z.strictObject({
  datasetId: uuidType<"Dataset">(),
  geometryColumnId: uuidType<"DatasetColumn">(),
  geometryEncoding: GeometryEncodingSchema,
  keyColumnId: uuidType<"DatasetColumn">(),
  displayNameColumnId: uuidType<"DatasetColumn">().optional(),
  simplification: GeometrySimplificationSchema,
});

/** A query column that already holds geometry. */
export const GeometryColumnBindingSchema = z.strictObject({
  type: z.literal("geometryColumn"),
  column: uuidType<"QueryColumn">(),
  encoding: GeometryEncodingSchema,
  family: z.enum(GEOMETRY_FAMILIES),
  simplification: GeometrySimplificationSchema.optional(),
});

/** Join rows onto a boundary dataset by a shared key. */
export const BoundaryJoinBindingSchema = z.strictObject({
  type: z.literal("joinToBoundaries"),
  dataKeyColumn: uuidType<"QueryColumn">(),
  boundary: BoundarySourceSchema,
  matching: z.enum(["exact", "normalizedName"]),
  aggregation: AreaAggregationSchema,
});

/** A geometry column restricted to point features. */
export const PointGeometryBindingSchema = z.strictObject({
  type: z.literal("geometryColumn"),
  column: uuidType<"QueryColumn">(),
  encoding: GeometryEncodingSchema,
  family: z.literal("point"),
  simplification: z.undefined(),
});

const PointBindingSchema = z.discriminatedUnion("type", [
  LatLngColumnsBindingSchema,
  PointGeometryBindingSchema,
]);

/** Aggregate point features onto a boundary dataset. */
export const PointAggregationBindingSchema = z.strictObject({
  type: z.literal("aggregatePointsToBoundaries"),
  points: PointBindingSchema,
  boundary: BoundarySourceSchema,
  aggregation: AreaAggregationSchema,
});

const GeoBindingSchema = z.discriminatedUnion("type", [
  LatLngColumnsBindingSchema,
  GeometryColumnBindingSchema,
  BoundaryJoinBindingSchema,
  PointAggregationBindingSchema,
]);

const PolygonGeometryBindingSchema = GeometryColumnBindingSchema.extend({
  family: z.literal("polygon"),
}).strict();
const AreaGeoBindingSchema = z.discriminatedUnion("type", [
  PolygonGeometryBindingSchema,
  BoundaryJoinBindingSchema,
  PointAggregationBindingSchema,
]);

const LayerValueSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("queryColumn"),
    column: uuidType<"QueryColumn">(),
  }),
  z.strictObject({
    type: z.literal("areaAggregation"),
    outputValueId: AreaAggregationOutputIdSchema,
  }),
]);

const NormalizationRefSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("queryColumn"),
    column: uuidType<"QueryColumn">(),
  }),
  z.strictObject({
    type: z.literal("boundaryColumn"),
    column: uuidType<"DatasetColumn">(),
  }),
]);

const NoDataStyleSchema = z.strictObject({
  color: z.string(),
  label: z.string(),
});

const AutomaticClassificationSchema = z.strictObject({
  method: z.enum(AUTOMATIC_CLASSIFICATION_METHODS),
  classCount: z.number().int().min(1).max(7),
});
const ManualClassificationSchema = z.strictObject({
  method: z.literal("manual"),
  breaks: z
    .array(z.number().finite())
    .readonly()
    .refine((breaks) => {
      return breaks.every((value, index) => {
        return index === 0 || value > breaks[index - 1]!;
      });
    }, "Manual breaks must be strictly increasing"),
});
const ClassificationSchema = z.discriminatedUnion("method", [
  AutomaticClassificationSchema,
  ManualClassificationSchema,
]);

const ColorSpecSchema = z.discriminatedUnion("type", [
  SingleColorSpecSchema,
  z.strictObject({
    type: z.literal("categorical"),
    value: LayerValueSchema,
    categories: z
      .array(
        z.strictObject({
          value: z.string(),
          color: z.string(),
          label: z.string(),
        }),
      )
      .max(3)
      .readonly(),
    other: z.strictObject({ color: z.string(), label: z.string() }),
    noData: NoDataStyleSchema,
  }),
  z.strictObject({
    type: z.literal("graduated"),
    value: LayerValueSchema,
    ramp: z.array(z.string()).min(1).readonly(),
    classification: ClassificationSchema,
    normalization: z
      .strictObject({
        denominator: NormalizationRefSchema,
        multiplier: z.union([
          z.literal(1),
          z.literal(1_000),
          z.literal(100_000),
        ]),
      })
      .optional(),
    noData: NoDataStyleSchema,
  }),
]);

/** Point paint with a constant radius. */
export const CircleSymbologySchema = z.strictObject({
  type: z.literal("circle"),
  radius: z.number(),
  color: ColorSpecSchema,
  stroke: StrokeSpecSchema,
});

/** Point paint whose radius scales with a numeric column. */
export const ProportionalSymbolSchema = z.strictObject({
  type: z.literal("proportionalSymbol"),
  value: uuidType<"QueryColumn">(),
  minRadius: z.number(),
  maxRadius: z.number(),
  scale: z.enum(["sqrt", "linear"]),
  color: ColorSpecSchema,
  stroke: StrokeSpecSchema,
});

/** Line paint for linear geometry. */
export const LineSymbologySchema = z.strictObject({
  type: z.literal("line"),
  color: ColorSpecSchema,
  stroke: StrokeSpecSchema,
});

/** Polygon fill paint with an independent outline. */
export const FillSymbologySchema = z.strictObject({
  type: z.literal("fill"),
  color: ColorSpecSchema,
  stroke: StrokeSpecSchema,
  opacity: z.number().min(0).max(1),
});

const SymbologySchema = z.discriminatedUnion("type", [
  CircleSymbologySchema,
  ProportionalSymbolSchema,
  LineSymbologySchema,
  FillSymbologySchema,
]);

/** Legend chrome plus persisted classification output. */
export const LegendSchema = V1LegendSchema.extend({
  breaks: z
    .array(
      z.strictObject({
        lower: z.number().optional(),
        upper: z.number().optional(),
      }),
    )
    .readonly(),
  entries: z
    .array(
      z.strictObject({
        type: z.enum(LEGEND_ENTRY_TYPES),
        color: z.string(),
        label: z.string(),
        count: z.number().int().min(0),
      }),
    )
    .readonly(),
}).strict();

/** Fields shared by every version 2 layer variant. */
export const LayerCommonShape = {
  __type: z.literal("MapLayer"),
  version: z.literal(1),
  id: uuidType<"MapLayer">(),
  name: z.string(),
  isVisible: z.boolean(),
  source: StructuredQuerySchema,
  popup: PopupSchema,
  legend: LegendSchema,
} as const;

const StandardLayerSchema = z.strictObject({
  ...LayerCommonShape,
  geoBinding: GeoBindingSchema.optional(),
  symbology: SymbologySchema,
  sensitivity: z.discriminatedUnion("mode", [
    ExactSensitivitySchema,
    JitterSensitivitySchema,
  ]),
});
const AggregateOnlyLayerSchema = z.strictObject({
  ...LayerCommonShape,
  geoBinding: AreaGeoBindingSchema.optional(),
  symbology: FillSymbologySchema,
  sensitivity: AggregateOnlySensitivitySchema,
});

/** Version 2 layer: standard paint or aggregate-only fill. */
export const AvaMapConfigV2LayerSchema = z.union([
  StandardLayerSchema,
  AggregateOnlyLayerSchema,
]);

/** Version 2 persisted map configuration. */
export const AvaMapConfigV2Schema = z.strictObject({
  __type: z.literal("AvaMapConfig"),
  version: z.literal(2),
  basemap: BasemapSchema,
  view: ViewStateSchema,
  bookmarks: z.array(BookmarkSchema).readonly(),
  layers: z.array(AvaMapConfigV2LayerSchema).readonly(),
});
