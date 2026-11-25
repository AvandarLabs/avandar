import {
  COMMAND_ID_MESSAGE,
  COMMAND_ID_PATTERN,
  IconNameSchema,
  LocalizedStringSchema,
} from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { z } from "zod";

const SETTING_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
const CONTROL_KIND_MESSAGE =
  "must be columnPicker, select, segmented, switch, number, text, or color";

/**
 * How a plugin chart type is drawn. `transform` returns rows and a chart
 * spec that Avandar draws with a built-in chart, and `component` draws the
 * chart itself. A chart type's `render` field picks one.
 */
export const PLUGIN_VIZ_RENDER_MODES = ["transform", "component"] as const;

/**
 * The column types a `columnPicker` setting can ask for, so its picker lists
 * only matching columns. `any` lists every column.
 */
export const PLUGIN_VIZ_COLUMN_DATA_TYPES = [
  "numeric",
  "any",
  "temporal",
  "text",
] as const;

const PluginVizOptionSchema = z.strictObject({
  value: z.string().min(1),
  label: LocalizedStringSchema,
});

/**
 * The control a chart setting is edited with, one of the kinds Avandar's
 * built-in chart settings already use. Option labels, a number's unit, and
 * a text placeholder are `%key%` references.
 */
export const PluginVizSettingControlSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({
      kind: z.literal("columnPicker"),
      dataType: z.enum(PLUGIN_VIZ_COLUMN_DATA_TYPES).optional(),
    }),
    z.strictObject({
      kind: z.literal("select"),
      options: z
        .array(PluginVizOptionSchema)
        .min(1, "a select needs at least one option"),
    }),
    z.strictObject({
      kind: z.literal("segmented"),
      options: z
        .array(PluginVizOptionSchema)
        .min(2, "a segmented control needs at least two options"),
    }),
    z.strictObject({ kind: z.literal("switch") }),
    z.strictObject({
      kind: z.literal("number"),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().positive().optional(),
      unit: LocalizedStringSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal("text"),
      placeholder: LocalizedStringSchema.optional(),
    }),
    z.strictObject({ kind: z.literal("color") }),
  ],
  { error: CONTROL_KIND_MESSAGE },
);

const PluginVizSettingSchema = z.strictObject({
  key: z
    .string()
    .regex(
      SETTING_KEY_PATTERN,
      "must start with a letter and hold only letters and digits",
    ),
  label: LocalizedStringSchema,
  control: PluginVizSettingControlSchema,
  required: z.boolean().default(false),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

/**
 * The schema for one entry of a manifest's `contributes.vizTypes`: a chart
 * type the plugin adds to Avandar's chart picker. Rules that span entries,
 * such as unique ids and defaults that fit their control, are checked by
 * `getIssuesFromVizTypes`.
 */
export const PluginVizTypeSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, COMMAND_ID_MESSAGE),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
  render: z.enum(PLUGIN_VIZ_RENDER_MODES),
  settings: z.array(PluginVizSettingSchema).default([]),
});
