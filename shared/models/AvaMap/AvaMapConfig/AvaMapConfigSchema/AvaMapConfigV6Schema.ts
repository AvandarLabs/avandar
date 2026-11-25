import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import {
  SingleColorSpecSchema,
  StrokeSpecSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  CircleSymbologySchema,
  FillSymbologySchema,
  LineSymbologySchema,
  ProportionalSymbolSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import {
  AvaMapConfigV5LayerSchema,
  AvaMapConfigV5Schema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";

const [, CategoricalColorSpecSchema, V5GraduatedColorSpecSchema] =
  CircleSymbologySchema.shape.color.options;
const [V5StandardLayerSchema, V5AggregateOnlyLayerSchema] =
  AvaMapConfigV5LayerSchema.options;

/**
 * One legend label per class. JSON has no `undefined`, so an unset label is
 * written as `null` and read back as `undefined`.
 */
const ClassLabelsSchema = z
  .array(
    z
      .string()
      .nullish()
      .transform((label) => {
        return label ?? undefined;
      }),
  )
  .readonly();

const V6ColorSpecSchema = z.discriminatedUnion("type", [
  SingleColorSpecSchema,
  CategoricalColorSpecSchema,
  V5GraduatedColorSpecSchema.extend({
    classLabels: ClassLabelsSchema,
  }).strict(),
]);

const V6FillSymbologySchema = FillSymbologySchema.extend({
  color: V6ColorSpecSchema,
}).strict();
const V6SymbologySchema = z.discriminatedUnion("type", [
  CircleSymbologySchema.extend({ color: V6ColorSpecSchema }).strict(),
  ProportionalSymbolSchema.extend({ color: V6ColorSpecSchema }).strict(),
  LineSymbologySchema.extend({ color: V6ColorSpecSchema }).strict(),
  V6FillSymbologySchema,
  z.strictObject({
    type: z.literal("cluster"),
    radiusPx: z.number(),
    color: SingleColorSpecSchema,
    stroke: StrokeSpecSchema,
  }),
  z.strictObject({
    type: z.literal("heatmap"),
    radiusPx: z.number(),
    weight: uuidType<"QueryColumn">().optional(),
    ramp: z.array(z.string()).readonly(),
  }),
]);

/** Version 6 layer with full point, line, and polygon symbology. */
export const V6StandardLayerSchema = V5StandardLayerSchema.extend({
  symbology: V6SymbologySchema,
}).strict();

/** Version 6 layer restricted to aggregate-only fill paint. */
export const V6AggregateOnlyLayerSchema = V5AggregateOnlyLayerSchema.extend({
  symbology: V6FillSymbologySchema,
}).strict();

/** Version 6 layer: graduated colors carry one optional label per class. */
export const AvaMapConfigV6LayerSchema = z.union([
  V6StandardLayerSchema,
  V6AggregateOnlyLayerSchema,
]);

/** Version 6 persisted map configuration. */
export const AvaMapConfigV6Schema = AvaMapConfigV5Schema.extend({
  version: z.literal(6),
  layers: z.array(AvaMapConfigV6LayerSchema).readonly(),
}).strict();
