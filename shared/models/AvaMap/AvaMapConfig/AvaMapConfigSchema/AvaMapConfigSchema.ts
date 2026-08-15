import { uuidType } from "$/lib/zodHelpers.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import { isSafePopupUrlTemplate } from "$/models/AvaMap/AvaMapConfig/isSafePopupUrlTemplate.ts";
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
  z.custom<StructuredQueryPartial>(
    (value) => {
      if (typeof value !== "object" || value === null) {
        return false;
      }
      if (Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    },
    { message: "Expected a structured query object" },
  );

const ColorSpecSchema = z
  .object({
    type: z.literal("single"),
    color: z.string(),
  })
  .strict();

const StrokeSpecSchema = z
  .object({
    width: z.number(),
    color: z.string(),
  })
  .strict();

const SymbologySchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("circle"),
      radius: z.number(),
      color: ColorSpecSchema,
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
      color: ColorSpecSchema,
      stroke: StrokeSpecSchema,
    })
    .strict(),
]);

const SensitivitySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("exact") }).strict(),
  z
    .object({
      mode: z.literal("jitter"),
      radiusMeters: z.number(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("aggregateOnly"),
      minCellCount: z.number(),
      minGeoLevel: z.string(),
    })
    .strict(),
]);

const GeoBindingSchema = z
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

const LegendSchema = z
  .object({
    title: z.string(),
    units: z.string().optional(),
    showNoData: z.boolean(),
    position: z.enum(["bottomLeft", "bottomRight", "topRight", "hidden"]),
  })
  .strict();

const LayerSchema = z
  .object({
    __type: z.literal("MapLayer"),
    version: z.literal(1),
    id: uuidType<"MapLayer">(),
    name: z.string(),
    isVisible: z.boolean(),
    source: StructuredQuerySchema,
    geoBinding: GeoBindingSchema.optional(),
    symbology: SymbologySchema,
    sensitivity: SensitivitySchema,
    popup: PopupSchema,
    legend: LegendSchema,
  })
  .strict();

const ConfigSchema = z
  .object({
    __type: z.literal("AvaMapConfig"),
    version: z.literal(1),
    basemap: BasemapSchema,
    view: ViewStateSchema,
    bookmarks: z.array(BookmarkSchema).readonly(),
    layers: z.array(LayerSchema).readonly(),
  })
  .strict();

/** Reads and writes the persisted JSON representation of a map config. */
export const AvaMapConfigSchema = {
  /** The Zod schema used to validate persisted map configuration JSON. */
  schema: ConfigSchema,

  /** Validates a raw JSON value and returns the current map config shape. */
  fromJson: (json: unknown): AvaMapConfigRead => {
    // z.custom keeps StructuredQuery opaque, so preserve its model relation at
    // this validation boundary.
    return ConfigSchema.parse(json) as AvaMapConfigRead;
  },

  /** Serializes a map config into a plain JSON value for persistence. */
  toJson: (config: AvaMapConfigRead): Json => {
    return JSON.parse(JSON.stringify(ConfigSchema.parse(config)));
  },
};
