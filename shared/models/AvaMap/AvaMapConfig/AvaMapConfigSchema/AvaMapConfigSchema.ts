import { isPlainObject } from "@avandar/utils";
import { uuidType } from "$/lib/zodHelpers.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import { isSafePopupUrlTemplate } from "$/models/AvaMap/AvaMapConfig/isSafePopupUrlTemplate.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { z } from "zod";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";
import type { Json } from "$/types/database.types.ts";

type StructuredQueryPartial = AvaMapConfigRead["layers"][number]["source"];

const ViewStateSchema = z
  .object({
    center: z.tuple([z.number(), z.number()]),
    zoom: z.number(),
  })
  .strict();

const BasemapSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("builtIn"),
      style: z.enum(AvaMapConfigValues.basemapStyleKeys),
    })
    .strict(),
  z
    .object({
      type: z.literal("custom"),
      kind: z.enum(AvaMapConfigValues.customBasemapKinds),
      url: z.string().min(1),
      attribution: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("none"),
      background: z.string().min(1),
    })
    .strict(),
]);

const BookmarkSchema = z
  .object({
    id: uuidType<"MapBookmark">(),
    name: z.string(),
    view: ViewStateSchema,
  })
  .strict();

/**
 * The layer query is opaque because its complete model has no Zod schema.
 * Map-owned fields remain strictly validated by the containing schemas.
 */
const StructuredQuerySchema: z.ZodType<StructuredQueryPartial> =
  z.custom<StructuredQueryPartial>(isPlainObject, {
    message: "Expected a structured query object",
  });

const StrokeSpecSchema = z
  .object({
    width: z.number(),
    color: z.string(),
  })
  .strict();

const SingleColorSpecSchema = z
  .object({
    type: z.literal("single"),
    color: z.string(),
  })
  .strict();

const V1SymbologySchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("circle"),
      radius: z.number(),
      color: SingleColorSpecSchema,
      stroke: StrokeSpecSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("proportionalSymbol"),
      value: uuidType<"QueryColumn">(),
      minRadius: z.number(),
      maxRadius: z.number(),
      scale: z.enum(["sqrt", "linear"]),
      color: SingleColorSpecSchema,
      stroke: StrokeSpecSchema,
    })
    .strict(),
]);

const ExactSensitivitySchema = z.object({ mode: z.literal("exact") }).strict();
const JitterSensitivitySchema = z
  .object({
    mode: z.literal("jitter"),
    radiusMeters: z.number(),
  })
  .strict();
const AggregateOnlySensitivitySchema = z
  .object({
    mode: z.literal("aggregateOnly"),
    minCellCount: z.number(),
    minGeoLevel: z.string(),
  })
  .strict();
const V1SensitivitySchema = z.discriminatedUnion("mode", [
  ExactSensitivitySchema,
  JitterSensitivitySchema,
  AggregateOnlySensitivitySchema,
]);

const LatLngColumnsBindingSchema = z
  .object({
    type: z.literal("latLngColumns"),
    latitude: uuidType<"QueryColumn">().optional(),
    longitude: uuidType<"QueryColumn">().optional(),
  })
  .strict();

const PopupSchema = z
  .object({
    columnIds: z.union([
      z.literal("all"),
      z.array(uuidType<"QueryColumn">()).readonly(),
    ]),
    action: z
      .object({
        label: z.string(),
        urlTemplate: z.string().refine(isSafePopupUrlTemplate, {
          message: "Popup URLs must use http or https",
        }),
      })
      .strict()
      .optional(),
  })
  .strict();

const V1LegendSchema = z
  .object({
    title: z.string(),
    units: z.string().optional(),
    showNoData: z.boolean(),
    position: z.enum(["bottomLeft", "bottomRight", "topRight", "hidden"]),
  })
  .strict();

const V1LayerSchema = z
  .object({
    __type: z.literal("MapLayer"),
    version: z.literal(1),
    id: uuidType<"MapLayer">(),
    name: z.string(),
    isVisible: z.boolean(),
    source: StructuredQuerySchema,
    geoBinding: LatLngColumnsBindingSchema.optional(),
    symbology: V1SymbologySchema,
    sensitivity: V1SensitivitySchema,
    popup: PopupSchema,
    legend: V1LegendSchema,
  })
  .strict();

const ConfigV1Schema = z
  .object({
    __type: z.literal("AvaMapConfig"),
    version: z.literal(1),
    basemap: BasemapSchema,
    view: ViewStateSchema,
    bookmarks: z.array(BookmarkSchema).readonly(),
    layers: z.array(V1LayerSchema).readonly(),
  })
  .strict();

const GeometryEncodingSchema = z.enum(["wkt", "wkb", "geojson"]);
const GeometrySimplificationSchema = z
  .object({ tolerancePixels: z.number().min(0) })
  .strict();
const AreaAggregationOutputIdSchema = uuidType<"AreaAggregationOutput">();

const AreaAggregationSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("count"),
      outputValueId: AreaAggregationOutputIdSchema,
    })
    .strict(),
  ...(["sum", "avg", "min", "max"] as const).map((operation) => {
    return z
      .object({
        operation: z.literal(operation),
        measureColumn: uuidType<"QueryColumn">(),
        outputValueId: AreaAggregationOutputIdSchema,
      })
      .strict();
  }),
]);

const BoundarySourceSchema = z
  .object({
    datasetId: uuidType<"Dataset">(),
    geometryColumnId: uuidType<"DatasetColumn">(),
    geometryEncoding: GeometryEncodingSchema,
    keyColumnId: uuidType<"DatasetColumn">(),
    displayNameColumnId: uuidType<"DatasetColumn">().optional(),
    simplification: GeometrySimplificationSchema,
  })
  .strict();

const GeometryColumnBindingSchema = z
  .object({
    type: z.literal("geometryColumn"),
    column: uuidType<"QueryColumn">(),
    encoding: GeometryEncodingSchema,
    family: z.enum(["point", "line", "polygon"]),
    simplification: GeometrySimplificationSchema.optional(),
  })
  .strict();

const BoundaryJoinBindingSchema = z
  .object({
    type: z.literal("joinToBoundaries"),
    dataKeyColumn: uuidType<"QueryColumn">(),
    boundary: BoundarySourceSchema,
    matching: z.enum(["exact", "normalizedName"]),
    aggregation: AreaAggregationSchema,
  })
  .strict();

const PointGeometryBindingSchema = z
  .object({
    type: z.literal("geometryColumn"),
    column: uuidType<"QueryColumn">(),
    encoding: GeometryEncodingSchema,
    family: z.literal("point"),
    simplification: z.undefined(),
  })
  .strict();

const PointBindingSchema = z.discriminatedUnion("type", [
  LatLngColumnsBindingSchema,
  PointGeometryBindingSchema,
]);

const PointAggregationBindingSchema = z
  .object({
    type: z.literal("aggregatePointsToBoundaries"),
    points: PointBindingSchema,
    boundary: BoundarySourceSchema,
    aggregation: AreaAggregationSchema,
  })
  .strict();

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
  z
    .object({
      type: z.literal("queryColumn"),
      column: uuidType<"QueryColumn">(),
    })
    .strict(),
  z
    .object({
      type: z.literal("areaAggregation"),
      outputValueId: AreaAggregationOutputIdSchema,
    })
    .strict(),
]);

const NormalizationRefSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("queryColumn"),
      column: uuidType<"QueryColumn">(),
    })
    .strict(),
  z
    .object({
      type: z.literal("boundaryColumn"),
      column: uuidType<"DatasetColumn">(),
    })
    .strict(),
]);

const NoDataStyleSchema = z
  .object({ color: z.string(), label: z.string() })
  .strict();

const AutomaticClassificationSchema = z
  .object({
    method: z.enum(["quantile", "equalInterval", "jenks", "standardDeviation"]),
    classCount: z.number().int().min(1).max(7),
  })
  .strict();
const ManualClassificationSchema = z
  .object({
    method: z.literal("manual"),
    breaks: z
      .array(z.number().finite())
      .readonly()
      .refine((breaks) => {
        return breaks.every((value, index) => {
          return index === 0 || value > breaks[index - 1]!;
        });
      }, "Manual breaks must be strictly increasing"),
  })
  .strict();
const ClassificationSchema = z.discriminatedUnion("method", [
  AutomaticClassificationSchema,
  ManualClassificationSchema,
]);

const ColorSpecSchema = z.discriminatedUnion("type", [
  SingleColorSpecSchema,
  z
    .object({
      type: z.literal("categorical"),
      value: LayerValueSchema,
      categories: z
        .array(
          z
            .object({
              value: z.string(),
              color: z.string(),
              label: z.string(),
            })
            .strict(),
        )
        .max(3)
        .readonly(),
      other: z.object({ color: z.string(), label: z.string() }).strict(),
      noData: NoDataStyleSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("graduated"),
      value: LayerValueSchema,
      ramp: z.array(z.string()).min(1).readonly(),
      classification: ClassificationSchema,
      normalization: z
        .object({
          denominator: NormalizationRefSchema,
          multiplier: z.union([
            z.literal(1),
            z.literal(1_000),
            z.literal(100_000),
          ]),
        })
        .strict()
        .optional(),
      noData: NoDataStyleSchema,
    })
    .strict(),
]);

const CircleSymbologySchema = z
  .object({
    type: z.literal("circle"),
    radius: z.number(),
    color: ColorSpecSchema,
    stroke: StrokeSpecSchema,
  })
  .strict();
const ProportionalSymbolSchema = z
  .object({
    type: z.literal("proportionalSymbol"),
    value: uuidType<"QueryColumn">(),
    minRadius: z.number(),
    maxRadius: z.number(),
    scale: z.enum(["sqrt", "linear"]),
    color: ColorSpecSchema,
    stroke: StrokeSpecSchema,
  })
  .strict();
const LineSymbologySchema = z
  .object({
    type: z.literal("line"),
    color: ColorSpecSchema,
    stroke: StrokeSpecSchema,
  })
  .strict();
const FillSymbologySchema = z
  .object({
    type: z.literal("fill"),
    color: ColorSpecSchema,
    stroke: StrokeSpecSchema,
    opacity: z.number().min(0).max(1),
  })
  .strict();
const SymbologySchema = z.discriminatedUnion("type", [
  CircleSymbologySchema,
  ProportionalSymbolSchema,
  LineSymbologySchema,
  FillSymbologySchema,
]);

const LegendSchema = V1LegendSchema.extend({
  breaks: z
    .array(
      z
        .object({
          lower: z.number().optional(),
          upper: z.number().optional(),
        })
        .strict(),
    )
    .readonly(),
  entries: z
    .array(
      z
        .object({
          type: z.enum(["value", "noData", "suppressed"]),
          color: z.string(),
          label: z.string(),
          count: z.number().int().min(0),
        })
        .strict(),
    )
    .readonly(),
}).strict();

const LayerCommonShape = {
  __type: z.literal("MapLayer"),
  version: z.literal(1),
  id: uuidType<"MapLayer">(),
  name: z.string(),
  isVisible: z.boolean(),
  source: StructuredQuerySchema,
  popup: PopupSchema,
  legend: LegendSchema,
} as const;

const StandardLayerSchema = z
  .object({
    ...LayerCommonShape,
    geoBinding: GeoBindingSchema.optional(),
    symbology: SymbologySchema,
    sensitivity: z.discriminatedUnion("mode", [
      ExactSensitivitySchema,
      JitterSensitivitySchema,
    ]),
  })
  .strict();
const AggregateOnlyLayerSchema = z
  .object({
    ...LayerCommonShape,
    geoBinding: AreaGeoBindingSchema.optional(),
    symbology: FillSymbologySchema,
    sensitivity: AggregateOnlySensitivitySchema,
  })
  .strict();
const LayerSchema = z.union([StandardLayerSchema, AggregateOnlyLayerSchema]);

const ConfigV2Schema = z
  .object({
    __type: z.literal("AvaMapConfig"),
    version: z.literal(2),
    basemap: BasemapSchema,
    view: ViewStateSchema,
    bookmarks: z.array(BookmarkSchema).readonly(),
    layers: z.array(LayerSchema).readonly(),
  })
  .strict();

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
const GridBinBindingSchema = z
  .object({
    type: z.literal("binPointsToGrid"),
    grid: z.enum(["hex", "square"]),
    sizeMeters: z.number().min(100).max(1_000_000),
    points: V3PointBindingSchema,
    aggregation: AreaAggregationSchema,
  })
  .strict();
const V3GeoBindingSchema = z.discriminatedUnion("type", [
  LatLngColumnsBindingSchema,
  V3GeometryColumnBindingSchema,
  BoundaryJoinBindingSchema,
  V3PointAggregationBindingSchema,
  GridBinBindingSchema,
]);
const V3PolygonGeometryBindingSchema = V3GeometryColumnBindingSchema.extend({
  family: z.literal("polygon"),
}).strict();
const V3AreaGeoBindingSchema = z.discriminatedUnion("type", [
  V3PolygonGeometryBindingSchema,
  BoundaryJoinBindingSchema,
  V3PointAggregationBindingSchema,
  GridBinBindingSchema,
]);

const ClusterSymbologySchema = z
  .object({
    type: z.literal("cluster"),
    radiusPx: z.number(),
    color: SingleColorSpecSchema,
    stroke: StrokeSpecSchema,
  })
  .strict();
const HeatmapSymbologySchema = z
  .object({
    type: z.literal("heatmap"),
    radiusPx: z.number(),
    weight: uuidType<"QueryColumn">().optional(),
    ramp: z.array(z.string()).readonly(),
  })
  .strict();
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
      z
        .object({
          value: z.number(),
          radiusPx: z.number(),
          label: z.string(),
        })
        .strict(),
    )
    .readonly(),
}).strict();
const V3LayerCommonShape = {
  ...LayerCommonShape,
  legend: V3LegendSchema,
} as const;
const V3StandardLayerSchema = z
  .object({
    ...V3LayerCommonShape,
    geoBinding: V3GeoBindingSchema.optional(),
    symbology: V3SymbologySchema,
    sensitivity: z.discriminatedUnion("mode", [
      ExactSensitivitySchema,
      JitterSensitivitySchema,
    ]),
  })
  .strict();
const V3AggregateOnlyLayerSchema = z
  .object({
    ...V3LayerCommonShape,
    geoBinding: V3AreaGeoBindingSchema.optional(),
    symbology: FillSymbologySchema,
    sensitivity: AggregateOnlySensitivitySchema,
  })
  .strict();
const V3LayerSchema = z.union([
  V3StandardLayerSchema,
  V3AggregateOnlyLayerSchema,
]);
const ConfigV3Schema = ConfigV2Schema.extend({
  version: z.literal(3),
  layers: z.array(V3LayerSchema).readonly(),
}).strict();

type ConfigV1 = z.infer<typeof ConfigV1Schema>;
type ConfigV1Layer = z.infer<typeof V1LayerSchema>;
type ConfigV2 = z.infer<typeof ConfigV2Schema>;
type ConfigV2Layer = z.infer<typeof LayerSchema>;

/** Migrates one version 1 layer without weakening its sensitivity. */
function _migrateVersion1Layer(layer: ConfigV1Layer): ConfigV2Layer {
  const legend = {
    ...layer.legend,
    units: layer.legend.units,
    breaks: [],
    entries: [],
  };
  if (layer.sensitivity.mode !== "aggregateOnly") {
    return LayerSchema.parse({
      ...layer,
      popup: { ...layer.popup, action: layer.popup.action },
      legend,
    });
  }
  return LayerSchema.parse({
    ...layer,
    popup: { ...layer.popup, action: layer.popup.action },
    geoBinding: undefined,
    symbology: MapLayer.createDefaultFillSymbology(),
    legend,
  });
}

/** Migrates a valid version 1 config into the version 2 representation. */
function _migrateVersion1(config: ConfigV1): ConfigV2 {
  return ConfigV2Schema.parse({
    ...config,
    version: 2,
    layers: config.layers.map(_migrateVersion1Layer),
  });
}

/** Adds version 3 fields to a version 2 point aggregation binding. */
function _migrateVersion2GeoBinding(
  binding: ConfigV2Layer["geoBinding"],
): z.infer<typeof V3GeoBindingSchema> | undefined {
  if (binding?.type === "geometryColumn") {
    return V3GeoBindingSchema.parse({ ...binding, sourceCrs: undefined });
  }
  if (
    binding?.type === "aggregatePointsToBoundaries" &&
    binding.points.type === "geometryColumn"
  ) {
    return V3GeoBindingSchema.parse({
      ...binding,
      points: { ...binding.points, sourceCrs: undefined },
    });
  }
  return V3GeoBindingSchema.optional().parse(binding);
}

/** Migrates a valid version 2 config into the current strict representation. */
function _migrateVersion2(config: ConfigV2): AvaMapConfigRead {
  return ConfigV3Schema.parse({
    ...config,
    version: 3,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        geoBinding: _migrateVersion2GeoBinding(layer.geoBinding),
        legend: { ...layer.legend, sizeStops: [] },
      };
    }),
  }) as AvaMapConfigRead;
}

/** Reads and writes the persisted JSON representation of a map config. */
export const AvaMapConfigSchema = {
  /** The Zod schema used to validate current persisted map configuration. */
  schema: ConfigV3Schema,

  /** Validates and migrates a raw JSON value to the current config shape. */
  fromJson: (json: unknown): AvaMapConfigRead => {
    const version = z
      .object({ __type: z.literal("AvaMapConfig"), version: z.number().int() })
      .passthrough()
      .parse(json).version;
    if (version === 1) {
      return _migrateVersion2(_migrateVersion1(ConfigV1Schema.parse(json)));
    }
    if (version === 2) {
      return _migrateVersion2(ConfigV2Schema.parse(json));
    }
    return ConfigV3Schema.parse(json) as AvaMapConfigRead;
  },

  /** Serializes a current map config into plain JSON for persistence. */
  toJson: (config: AvaMapConfigRead): Json => {
    return JSON.parse(JSON.stringify(ConfigV3Schema.parse(config)));
  },
};
