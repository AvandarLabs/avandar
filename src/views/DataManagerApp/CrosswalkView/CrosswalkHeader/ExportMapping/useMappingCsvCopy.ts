import { useLingui } from "@lingui/react/macro";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type {
  MappingCsvRow,
  MappingCsvStatus,
} from "@/lib/crosswalks/buildMappingCsvRows/buildMappingCsvRows";

/** The words for a change to a source column's values. */
function useConvertCopy(): (convert: CrosswalkMapping.Convert) => string {
  const { t, i18n } = useLingui();
  return (convert) => {
    switch (convert.kind) {
      case "parse_date": {
        const format = convert.format;
        return t`Read as a date (${format})`;
      }
      case "pad_text": {
        const length = i18n.number(convert.length);
        return t`Pad with zeros to ${length} characters`;
      }
      case "multiply": {
        // A factor such as 1/12 is exact in the export, not rounded to 0.083.
        const factor = i18n.number(convert.factor, {
          maximumSignificantDigits: 15,
        });
        return t`Multiply by ${factor}`;
      }
      case "trim_and_fix_case": {
        if (convert.letterCase === "lower") {
          return t`Trim spaces, lowercase`;
        }
        return convert.letterCase === "upper"
          ? t`Trim spaces, UPPERCASE`
          : t`Trim spaces`;
      }
    }
  };
}

/** The words for how a column is filled. */
function useFillKindCopy(): Record<MappingCsvRow["fillKind"], string> {
  const { t } = useLingui();
  return {
    column: t`A column`,
    constant: t`A fixed value`,
    expression: t`Combine`,
    empty: t`Leave empty`,
    none: t`Not filled yet`,
  };
}

/** The words for where a row's mapping stands. */
function useStatusCopy(): Record<MappingCsvStatus, string> {
  const { t } = useLingui();
  return {
    confirmed: t`Confirmed`,
    suggested: t`Suggested`,
    not_filled: t`Not filled yet`,
    skipped: t`Skipped`,
  };
}

/** The exported mapping's header row, and a row's cells, in words. */
export type MappingCsvCopy = {
  headers: string[];
  toCells: (row: MappingCsvRow) => string[];
};

/**
 * Translates the exported mapping: its headers, and each row's cells in
 * the same order. Used by Export mapping.
 */
export function useMappingCsvCopy(): MappingCsvCopy {
  const { t } = useLingui();
  const describeConvert = useConvertCopy();
  const fillKinds = useFillKindCopy();
  const statuses = useStatusCopy();
  const describeChange = (row: MappingCsvRow): string => {
    if (row.translation) {
      return row.translation.holdsLabels
        ? t`Translate labels`
        : t`Translate codes`;
    }
    return row.convert ? describeConvert(row.convert) : "";
  };
  const toCells = (row: MappingCsvRow): string[] => {
    const layoutName = row.layoutName;
    return [
      row.isReferenceLayout ? t`${layoutName} (reference)` : layoutName,
      row.datasetName,
      row.columnName,
      fillKinds[row.fillKind],
      row.filledFrom ?? "",
      describeChange(row),
      row.translation
        ? (row.translation.codeListName ?? t`A code list that no longer exists`)
        : "",
      statuses[row.status],
    ];
  };
  return {
    headers: [
      t`Layout`,
      t`Dataset`,
      t`Column of the combined dataset`,
      t`How it is filled`,
      t`Filled from`,
      t`Change to the values`,
      t`Code list`,
      t`Status`,
    ],
    toCells,
  };
}
