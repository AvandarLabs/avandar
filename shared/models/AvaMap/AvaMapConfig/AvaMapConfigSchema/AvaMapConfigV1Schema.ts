import { isPlainObject } from "@avandar/utils";
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import { isSafePopupUrlTemplate } from "$/models/AvaMap/AvaMapConfig/isSafePopupUrlTemplate.ts";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";

type StructuredQueryPartial = AvaMapConfigRead["layers"][number]["source"];

/** Camera center and zoom persisted on a map or bookmark. */
export const ViewStateSchema = z.strictObject({
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number(),
});

/** Built-in, custom, or empty backdrop behind map layers. */
export const BasemapSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("builtIn"),
    style: z.enum(AvaMapConfigValues.basemapStyleKeys),
  }),
  z.strictObject({
    type: z.literal("custom"),
    kind: z.enum(AvaMapConfigValues.customBasemapKinds),
    url: z.string().min(1),
    attribution: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal("none"),
    background: z.string().min(1),
  }),
]);

/** Saved camera position the author can return to. */
export const BookmarkSchema = z.strictObject({
  id: uuidType<"MapBookmark">(),
  name: z.string(),
  view: ViewStateSchema,
});

/**
 * The layer query is opaque because its complete model has no Zod schema.
 * Map-owned fields remain strictly validated by the containing schemas.
 */
export const StructuredQuerySchema: z.ZodType<StructuredQueryPartial> =
  z.custom<StructuredQueryPartial>(isPlainObject, {
    message: "Expected a structured query object",
  });

/** Outline width and color shared by point, line, and fill paint. */
export const StrokeSpecSchema = z.strictObject({
  width: z.number(),
  color: z.string(),
});

/** A single paint color with no data-driven classes. */
export const SingleColorSpecSchema = z.strictObject({
  type: z.literal("single"),
  color: z.string(),
});

const V1SymbologySchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("circle"),
    radius: z.number(),
    color: SingleColorSpecSchema,
    stroke: StrokeSpecSchema,
  }),
  z.strictObject({
    type: z.literal("proportionalSymbol"),
    value: uuidType<"QueryColumn">(),
    minRadius: z.number(),
    maxRadius: z.number(),
    scale: z.enum(["sqrt", "linear"]),
    color: SingleColorSpecSchema,
    stroke: StrokeSpecSchema,
  }),
]);

/** Draw every qualifying feature at its true location. */
export const ExactSensitivitySchema = z.strictObject({
  mode: z.literal("exact"),
});

/** Offset each point by a random distance up to `radiusMeters`. */
export const JitterSensitivitySchema = z.strictObject({
  mode: z.literal("jitter"),
  radiusMeters: z.number(),
});

/** Hide individual features and require area aggregation instead. */
export const AggregateOnlySensitivitySchema = z.strictObject({
  mode: z.literal("aggregateOnly"),
  minCellCount: z.number(),
  minGeoLevel: z.string(),
});

const V1SensitivitySchema = z.discriminatedUnion("mode", [
  ExactSensitivitySchema,
  JitterSensitivitySchema,
  AggregateOnlySensitivitySchema,
]);

/** Latitude and longitude columns that locate point features. */
export const LatLngColumnsBindingSchema = z.strictObject({
  type: z.literal("latLngColumns"),
  latitude: uuidType<"QueryColumn">().optional(),
  longitude: uuidType<"QueryColumn">().optional(),
});

/** Popup fields and optional outbound link for a clicked feature. */
export const PopupSchema = z.strictObject({
  columnIds: z.union([
    z.literal("all"),
    z.array(uuidType<"QueryColumn">()).readonly(),
  ]),
  action: z
    .strictObject({
      label: z.string(),
      urlTemplate: z.string().refine(isSafePopupUrlTemplate, {
        message: "Popup URLs must use http or https",
      }),
    })
    .optional(),
});

/** Legend chrome persisted before classification output existed. */
export const V1LegendSchema = z.strictObject({
  title: z.string(),
  units: z.string().optional(),
  showNoData: z.boolean(),
  position: z.enum(["bottomLeft", "bottomRight", "topRight", "hidden"]),
});

/** One version 1 map layer, including its original point-only paint. */
export const AvaMapConfigV1LayerSchema = z.strictObject({
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
});

/** Version 1 persisted map configuration. */
export const AvaMapConfigV1Schema = z.strictObject({
  __type: z.literal("AvaMapConfig"),
  version: z.literal(1),
  basemap: BasemapSchema,
  view: ViewStateSchema,
  bookmarks: z.array(BookmarkSchema).readonly(),
  layers: z.array(AvaMapConfigV1LayerSchema).readonly(),
});
