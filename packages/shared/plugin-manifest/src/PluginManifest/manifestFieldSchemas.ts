import { LOCALIZED_KEY_PATTERN } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";
import { z } from "zod";

const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The format of a command id or a chart type id: lowercase words of letters,
 * digits, and hyphens, separated by dots. The manifest schemas share it so
 * both kinds of id follow one rule.
 */
export const COMMAND_ID_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;

/** The issue message for an id that does not match `COMMAND_ID_PATTERN`. */
export const COMMAND_ID_MESSAGE =
  "must be lowercase letters, digits, and hyphens, in dot-separated words";

/**
 * A user-facing manifest string, which must be a `%key%` reference to
 * `locales/en.json`, for example a command title or a chart setting label.
 */
export const LocalizedStringSchema = z
  .string()
  .regex(LOCALIZED_KEY_PATTERN, "must be a %key% reference to locales/en.json");

/**
 * A Tabler icon name such as `chart-dots`, for the plugin, command, and
 * chart type icons a manifest declares.
 */
export const IconNameSchema = z
  .string()
  .regex(ICON_NAME_PATTERN, "must be a Tabler icon name, e.g. chart-dots");
