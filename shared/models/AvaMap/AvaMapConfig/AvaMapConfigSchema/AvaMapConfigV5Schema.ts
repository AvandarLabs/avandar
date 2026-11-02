import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import {
  BasemapSchema,
  BookmarkSchema,
  ViewStateSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  AnnotationLayerSchema,
  AoiPolygonSchema,
  TimeRangeSchema,
  V4AggregateOnlyLayerSchema,
  V4LayerCommonShape,
  V4StandardLayerSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";

/** Where a layer reads its disputed-status values from. */
const DisputedStatusRefSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("queryColumn"),
    column: uuidType<"QueryColumn">(),
  }),
  z.strictObject({
    type: z.literal("boundaryColumn"),
    column: uuidType<"DatasetColumn">(),
  }),
]);

/** Disputed and undetermined value lists, which must not overlap. */
const DisputedStatusValuesSchema = z
  .strictObject({
    disputed: z.array(z.string()).readonly(),
    undetermined: z.array(z.string()).readonly(),
  })
  .refine((values) => {
    const disputed = new Set(values.disputed);
    return !values.undetermined.some((value) => {
      return disputed.has(value);
    });
  }, "A value cannot be both disputed and undetermined");

const V5LayerCommonShape = {
  ...V4LayerCommonShape,
  disputedStatusColumn: DisputedStatusRefSchema.optional(),
  disputedStatusValues: DisputedStatusValuesSchema,
} as const;

const V5StandardLayerSchema =
  V4StandardLayerSchema.extend(V5LayerCommonShape).strict();
const V5AggregateOnlyLayerSchema =
  V4AggregateOnlyLayerSchema.extend(V5LayerCommonShape).strict();

/** Version 5 layer: standard paint or aggregate-only fill. */
export const AvaMapConfigV5LayerSchema = z.union([
  V5StandardLayerSchema,
  V5AggregateOnlyLayerSchema,
]);

const ExportHeaderLineSchema = z.strictObject({
  isVisible: z.boolean(),
  text: z.string(),
});

/**
 * Fills in a missing `disclaimer` key with `undefined` before validation, so
 * an absent key and an explicit `undefined` parse identically.
 *
 * `z.union([z.string().min(1), z.undefined()])` is what keeps `disclaimer` a
 * required key in `z.infer`, matching `ExportLayout.disclaimer`'s
 * `string | undefined` type exactly. Wrapping the field in `.optional()`
 * instead would tolerate a missing key too, but it infers an optional key
 * (`disclaimer?:`), which does not match the model.
 */
function _fillMissingDisclaimer(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !("disclaimer" in value)) {
    return { ...value, disclaimer: undefined };
  }
  return value;
}

/** Persisted page furniture. A blank disclaimer is rejected, not stored. */
export const ExportLayoutSchema = z.preprocess(
  _fillMissingDisclaimer,
  z.strictObject({
    paper: z.enum(AvaMapConfigValues.exportPapers),
    orientation: z.enum(AvaMapConfigValues.exportOrientations),
    title: ExportHeaderLineSchema,
    subtitle: ExportHeaderLineSchema,
    northArrow: z.boolean(),
    scaleBar: z.boolean(),
    sourceLine: z.string(),
    disclaimer: z.union([z.string().min(1), z.undefined()]),
  }),
);

/** Version 5 persisted map configuration. */
export const AvaMapConfigV5Schema = z.strictObject({
  __type: z.literal("AvaMapConfig"),
  version: z.literal(5),
  basemap: BasemapSchema,
  view: ViewStateSchema,
  bookmarks: z.array(BookmarkSchema).readonly(),
  layers: z.array(AvaMapConfigV5LayerSchema).readonly(),
  aoi: AoiPolygonSchema.optional(),
  timeRange: TimeRangeSchema.optional(),
  annotations: AnnotationLayerSchema,
  annotationsZIndex: z.number().int().min(0),
  exportLayout: ExportLayoutSchema,
});
