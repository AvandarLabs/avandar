import {
  COMMAND_ID_MESSAGE,
  COMMAND_ID_PATTERN,
  LocalizedStringSchema,
} from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { z } from "zod";

/**
 * The largest file, in bytes, a content item may bundle: 1 MiB. A plugin's
 * content ships inside the app's build output, so `readPluginDirectory`
 * rejects a bigger file before it reaches a build.
 */
export const MAX_CONTENT_FILE_BYTES = 1_048_576;

const CONTENT_FILE_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.csv$/;

/**
 * The schema for one entry of a manifest's `contributes.content`: a CSV file
 * the plugin bundles, which installing the plugin imports as a workspace
 * dataset named by `title` and described by `description`. `id` is how a
 * workspace remembers what it already imported, so it must stay stable
 * across versions. That ids are unique is checked by `PluginManifestSchema`.
 */
export const PluginContentItemSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, COMMAND_ID_MESSAGE),
  kind: z.literal("dataset"),
  title: LocalizedStringSchema,
  description: LocalizedStringSchema,
  file: z
    .string()
    .regex(
      CONTENT_FILE_PATTERN,
      "must be a relative path to a .csv file inside the plugin folder",
    ),
});
