import { LocalizedStringSchema } from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { z } from "zod";

const DATA_SLOT_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
const DATA_SLOT_KEY_MESSAGE =
  "must start with a letter and hold only letters and digits";
const ATTRIBUTE_TYPE_MESSAGE =
  "must be number, date, text, boolean, geo.admin1, or geo.admin2";

/**
 * The kinds of value a data slot attribute holds. Each one decides which
 * workspace field types an admin may bind the attribute to, and how the
 * install wizard labels it. `geo.admin1` and `geo.admin2` are text that names
 * a province or district.
 */
export const DATA_SLOT_ATTRIBUTE_TYPES = [
  "number",
  "date",
  "text",
  "boolean",
  "geo.admin1",
  "geo.admin2",
] as const;

/**
 * One kind of data slot attribute value, for typing code that checks which
 * workspace fields an attribute can bind to.
 */
export type DataSlotAttributeType = (typeof DATA_SLOT_ATTRIBUTE_TYPES)[number];

const DataSlotKeySchema = z.string().regex(DATA_SLOT_KEY_PATTERN);

// A record reports a key that fails its key schema as "Invalid key in
// record", so each keyed record carries the key rule's message itself.
function _getKeyIssueMessage(issue: { code?: string }): string | undefined {
  return issue.code === "invalid_key" ? DATA_SLOT_KEY_MESSAGE : undefined;
}

/**
 * The schema for one attribute of a data slot: a value the plugin reads from
 * each bound record, such as a case's onset date. Required by default, so a
 * binding must map it to a workspace field.
 */
const PluginDataSlotAttributeSchema = z.strictObject({
  type: z.enum(DATA_SLOT_ATTRIBUTE_TYPES, { error: ATTRIBUTE_TYPE_MESSAGE }),
  title: LocalizedStringSchema,
  required: z.boolean().default(true),
});

/**
 * The schema for one entry of a manifest's `dataSlots`: the shape of the
 * records a plugin reads, which an admin binds to a case type or a dataset
 * when installing it. Optional by default. `concept` names a case type the
 * install wizard lists first. That a slot declares at least one attribute is
 * checked by `PluginManifestSchema`.
 */
export const PluginDataSlotSchema = z.strictObject({
  title: LocalizedStringSchema,
  description: LocalizedStringSchema.optional(),
  concept: z.string().trim().min(1).optional(),
  required: z.boolean().default(false),
  attributes: z.record(DataSlotKeySchema, PluginDataSlotAttributeSchema, {
    error: _getKeyIssueMessage,
  }),
});

/**
 * The schema for a manifest's `dataSlots`: data slots keyed by slot id, the
 * id a plugin passes to `avandar.data.querySlot`.
 */
export const PluginDataSlotsSchema = z.record(
  DataSlotKeySchema,
  PluginDataSlotSchema,
  { error: _getKeyIssueMessage },
);
