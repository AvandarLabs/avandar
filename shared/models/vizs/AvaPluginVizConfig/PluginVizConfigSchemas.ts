import { z } from "zod";
import { brandedStringType } from "$/lib/zodHelpers.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  AvaPluginVizConfig,
  UiPluginVizConfig,
} from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

const PluginVizSettingsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]).optional(),
);

/**
 * Checks a plugin chart config keyed by column ID, for example one read back
 * from a saved dashboard, before anything renders it.
 */
export const AvaPluginVizConfigSchema: z.ZodType<AvaPluginVizConfig> = z.object(
  {
    vizType: z.literal("plugin"),
    pluginId: z.string().min(1),
    pluginVizId: z.string().min(1),
    columnSettings: z.record(
      z.string(),
      brandedStringType<QueryColumn.Id>().optional(),
    ),
    settings: PluginVizSettingsSchema,
  },
);

/**
 * Checks a plugin chart config keyed by `QueryResult` column name, for
 * example one read from an Explorer URL, before it is used.
 */
export const UiPluginVizConfigSchema: z.ZodType<UiPluginVizConfig> = z.object({
  vizType: z.literal("plugin"),
  pluginId: z.string().min(1),
  pluginVizId: z.string().min(1),
  columnSettings: z.record(z.string(), z.string().optional()),
  settings: PluginVizSettingsSchema,
});
