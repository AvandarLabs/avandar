import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import { AvaMapConfigV7Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";

const ExportHeaderLineSchema = z.strictObject({
  isVisible: z.boolean(),
  text: z.string(),
});

/** A feature list printed after the map. `sort` unset is the default order. */
const ExportFeatureListSchema = z.strictObject({
  layerId: uuidType<"MapLayer">(),
  columnIds: z.array(uuidType<"QueryColumn">()).readonly(),
  sort: z
    .strictObject({
      columnId: uuidType<"QueryColumn">(),
      direction: z.enum(AvaMapConfigValues.exportFeatureListSortDirections),
    })
    .optional(),
  maxRows: z
    .number()
    .int()
    .min(1)
    .max(AvaMapConfigValues.exportFeatureListMaxRows),
});

/**
 * Fills in a missing `disclaimer` key with `undefined` before validation, so
 * an absent key and an explicit `undefined` parse identically, as version 5
 * does.
 */
function _fillMissingDisclaimer(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !("disclaimer" in value)) {
    return { ...value, disclaimer: undefined };
  }
  return value;
}

/** Version 8 page furniture: version 5's fields plus `featureList`. */
export const V8ExportLayoutSchema = z.preprocess(
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
    featureList: ExportFeatureListSchema.optional(),
  }),
);

/** Version 8 persisted map configuration. */
export const AvaMapConfigV8Schema = AvaMapConfigV7Schema.extend({
  version: z.literal(8),
  exportLayout: V8ExportLayoutSchema,
}).strict();
