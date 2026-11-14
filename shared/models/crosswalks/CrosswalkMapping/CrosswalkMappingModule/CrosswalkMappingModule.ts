import { z } from "zod";
import type {
  CrosswalkConvert,
  CrosswalkFill,
} from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.types.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { Json } from "$/types/database.types.ts";

/** The fill format this code reads and writes. */
const FILL_VERSION = 1;

/** The longest length a pad conversion can ask for. */
const MAX_PAD_TEXT_LENGTH = 64;

/** A `{column name}` placeholder in a Combine expression. */
const COMBINE_PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;

function _isNotBlank(text: string): boolean {
  return text.trim() !== "";
}

const StoredConvertSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("parse_date"), format: z.string().min(1) }),
  z.object({
    kind: z.literal("pad_text"),
    length: z.number().int().min(1).max(MAX_PAD_TEXT_LENGTH),
  }),
  z.object({ kind: z.literal("multiply"), factor: z.number() }),
  z.object({
    kind: z.literal("trim_and_fix_case"),
    letter_case: z.enum(["keep", "lower", "upper"]),
  }),
]);

/**
 * Version 1 of `crosswalks__mappings.fill`, snake_case. A `column` fill
 * converts or translates codes, never both.
 */
const StoredFillV1Schema = z
  .discriminatedUnion("kind", [
    z.object({
      version: z.literal(FILL_VERSION),
      kind: z.literal("column"),
      source_column: z.string().refine(_isNotBlank),
      convert: StoredConvertSchema.nullable(),
      code_list_id: z.uuid().nullable(),
      holds_labels: z.boolean(),
    }),
    z.object({
      version: z.literal(FILL_VERSION),
      kind: z.literal("constant"),
      value: z.string(),
    }),
    z.object({
      version: z.literal(FILL_VERSION),
      kind: z.literal("expression"),
      sql: z.string().trim().min(1),
    }),
    z.object({ version: z.literal(FILL_VERSION), kind: z.literal("empty") }),
  ])
  .refine(
    (fill) => {
      return (
        fill.kind !== "column" ||
        fill.convert === null ||
        fill.code_list_id === null
      );
    },
    { message: "A column fill either converts or translates codes" },
  );

/** A fill as `crosswalks__mappings.fill` stores it. */
export type StoredCrosswalkFill = z.infer<typeof StoredFillV1Schema>;
type StoredConvert = z.infer<typeof StoredConvertSchema>;

function _convertFromStored(stored: StoredConvert): CrosswalkConvert {
  if (stored.kind === "trim_and_fix_case") {
    return { kind: stored.kind, letterCase: stored.letter_case };
  }
  return stored;
}

function _convertToStored(convert: CrosswalkConvert): StoredConvert {
  if (convert.kind === "trim_and_fix_case") {
    return { kind: convert.kind, letter_case: convert.letterCase };
  }
  return convert;
}

function _fillFromStored(stored: StoredCrosswalkFill): CrosswalkFill {
  if (stored.kind === "column") {
    return {
      kind: "column",
      sourceColumn: stored.source_column,
      convert:
        stored.convert === null
          ? undefined
          : _convertFromStored(stored.convert),
      codeListId: (stored.code_list_id ?? undefined) as
        | DataDictionaryCodeList.Id
        | undefined,
      holdsLabels: stored.holds_labels,
    };
  }
  const { version: _version, ...fill } = stored;
  return fill;
}

/**
 * Reads a stored fill, whatever version wrote it. Throws on a version this
 * code does not know and on a fill its version's schema refuses, so a
 * malformed mapping fails loudly instead of compiling to the wrong SQL.
 */
function fillFromDBJson(json: Json): CrosswalkFill {
  const { version } = z.object({ version: z.number() }).parse(json);
  if (version !== FILL_VERSION) {
    throw new Error(`Unknown crosswalk fill version: ${version}`);
  }
  return _fillFromStored(StoredFillV1Schema.parse(json));
}

/**
 * A fill in the stored shape, for `crosswalks__mappings.fill` and the save
 * RPC.
 */
function fillToDBJson(fill: CrosswalkFill): StoredCrosswalkFill {
  if (fill.kind === "column") {
    return {
      version: FILL_VERSION,
      kind: "column",
      source_column: fill.sourceColumn,
      convert:
        fill.convert === undefined ? null : _convertToStored(fill.convert),
      code_list_id: fill.codeListId ?? null,
      holds_labels: fill.holdsLabels,
    };
  }
  return { version: FILL_VERSION, ...fill };
}

/**
 * The column names a Combine expression's `{column name}` placeholders
 * name, exactly as written, in order of first use, each once. A blank
 * placeholder names nothing.
 */
function getCombineColumnNames(sql: string): string[] {
  const names = [...sql.matchAll(COMBINE_PLACEHOLDER_PATTERN)]
    .map((match) => {
      return match[1] ?? "";
    })
    .filter(_isNotBlank);
  return [...new Set(names)];
}

/**
 * Helpers for crosswalk mappings: reading and writing a fill in its
 * versioned stored shape, and the column names a Combine expression uses.
 * Use it to read a fill from the database or write one to it, and to check
 * which columns a Combine expression needs.
 */
export const CrosswalkMappingModule = {
  COMBINE_PLACEHOLDER_PATTERN,
  MAX_PAD_TEXT_LENGTH,
  fillFromDBJson,
  fillToDBJson,
  getCombineColumnNames,
};
