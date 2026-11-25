import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

/** A change to a source column's values, or none. */
export type ConvertKind = CrosswalkMapping.Convert["kind"] | "none";

/** Multiply's presets, by the unit change each stands for. */
export const MULTIPLY_PRESETS = [
  { key: "months_to_years", factor: 1 / 12 },
  { key: "years_to_months", factor: 12 },
  { key: "days_to_years", factor: 1 / 365.25 },
] as const;

/** One of Multiply's presets. */
export type MultiplyPresetKey = (typeof MULTIPLY_PRESETS)[number]["key"];

/** The digits Pad with zeros starts at: a US ZIP code. */
const DEFAULT_PAD_LENGTH = 5;

/** The format Read as a date starts at when none was detected: ISO. */
const FALLBACK_DATE_FORMAT: string = ColumnProfileSql.DATE_FORMATS[0];

/**
 * The conversions offered for a source column, in the order the Select
 * lists them. Padding needs whole numbers or text: a decimal reads as
 * `501.0`, which no padding fixes.
 */
export function getConvertKinds(
  sourceDataType: AvaDataType.T | undefined,
): ConvertKind[] {
  const canPad =
    sourceDataType === undefined ||
    sourceDataType === "bigint" ||
    sourceDataType === "varchar";
  return [
    "none",
    "parse_date",
    ...(canPad ? (["pad_text"] as const) : []),
    "multiply",
    "trim_and_fix_case",
  ];
}

/** The preset a factor is, or undefined for any other number. */
export function getMultiplyPreset(
  factor: number,
): MultiplyPresetKey | undefined {
  return MULTIPLY_PRESETS.find((preset) => {
    return preset.factor === factor;
  })?.key;
}

/**
 * The conversion a fill starts with when the user picks a kind: the
 * current one when it is already that kind, otherwise that kind's default.
 * Read as a date starts with the format detected in the column.
 */
export function makeConvertForKind(
  options: Readonly<{
    kind: ConvertKind;
    current: CrosswalkMapping.Convert | undefined;
    detectedDateFormat: string | undefined;
  }>,
): CrosswalkMapping.Convert | undefined {
  const { kind, current } = options;
  if (kind === "none") {
    return undefined;
  }
  if (current?.kind === kind) {
    return current;
  }
  switch (kind) {
    case "parse_date":
      return {
        kind,
        format: options.detectedDateFormat ?? FALLBACK_DATE_FORMAT,
      };
    case "pad_text":
      return { kind, length: DEFAULT_PAD_LENGTH };
    case "multiply":
      return { kind, factor: MULTIPLY_PRESETS[0].factor };
    case "trim_and_fix_case":
      return { kind, letterCase: "keep" };
  }
}
