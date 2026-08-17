import { isPlainObject } from "@avandar/utils";
import { uuidType } from "$/lib/zodHelpers.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import { isSafePopupUrlTemplate } from "$/models/AvaMap/AvaMapConfig/isSafePopupUrlTemplate.ts";
import { z } from "zod";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";

type StructuredQueryPartial = AvaMapConfigRead["layers"][number]["source"];

/** Camera center and zoom persisted on a map or bookmark. */
export const ViewStateSchema = z
  .object({
    center: z.tuple([z.number(), z.number()]),
    zoom: z.number(),
  })
  .strict();

/** Built-in, custom, or empty backdrop behind map layers. */
export const BasemapSchema = z.discriminatedUnion("type", [
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

/** Saved camera position the author can return to. */
export const BookmarkSchema = z
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
export const StructuredQuerySchema: z.ZodType<StructuredQueryPartial> =
  z.custom<StructuredQueryPartial>(isPlainObject, {
    message: "Expected a structured query object",
  });

/** Outline width and color shared by point, line, and fill paint. */
export const StrokeSpecSchema = z
  .object({
    width: z.number(),
    color: z.string(),
  })
  .strict();

/** A single paint color with no data-driven classes. */
export const SingleColorSpecSchema = z
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

/** Draw every qualifying feature at its true location. */
export const ExactSensitivitySchema = z
  .object({ mode: z.literal("exact") })
  .strict();

/** Offset each point by a random distance up to `radiusMeters`. */
export const JitterSensitivitySchema = z
  .object({
    mode: z.literal("jitter"),
    radiusMeters: z.number(),
  })
  .strict();

/** Hide individual features and require area aggregation instead. */
export const AggregateOnlySensitivitySchema = z
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

/** Latitude and longitude columns that locate point features. */
export const LatLngColumnsBindingSchema = z
  .object({
    type: z.literal("latLngColumns"),
    latitude: uuidType<"QueryColumn">().optional(),
    longitude: uuidType<"QueryColumn">().optional(),
  })
  .strict();

/** Popup fields and optional outbound link for a clicked feature. */
export const PopupSchema = z
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

/** Legend chrome persisted before classification output existed. */
export const V1LegendSchema = z
  .object({
    title: z.string(),
    units: z.string().optional(),
    showNoData: z.boolean(),
    position: z.enum(["bottomLeft", "bottomRight", "topRight", "hidden"]),
  })
  .strict();

/** One version 1 map layer, including its original point-only paint. */
export const AvaMapConfigV1LayerSchema = z
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

/** Version 1 persisted map configuration. */
export const AvaMapConfigV1Schema = z
  .object({
    __type: z.literal("AvaMapConfig"),
    version: z.literal(1),
    basemap: BasemapSchema,
    view: ViewStateSchema,
    bookmarks: z.array(BookmarkSchema).readonly(),
    layers: z.array(AvaMapConfigV1LayerSchema).readonly(),
  })
  .strict();
