import { useLingui } from "@lingui/react/macro";
import { toDateFormatLabel } from "@/lib/crosswalks/toDateFormatLabel/toDateFormatLabel";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";

/** A fill as the Filled from cell shows it. */
export type FillSummary = {
  /** The source column, the fixed value, the expression, or Leave empty. */
  main: string;
  /** What is done to it, or what kind of fill it is. */
  detail: string | undefined;
  /** True for Leave empty, which is shown dimmed. */
  isEmpty: boolean;
};

/** The phrase for a trim conversion, by the letter case it asks for. */
function useTrimDescriber(): (
  letterCase: "keep" | "lower" | "upper",
) => string {
  const { t } = useLingui();
  return (letterCase) => {
    switch (letterCase) {
      case "keep":
        return t`Spaces trimmed`;
      case "lower":
        return t`Spaces trimmed, lowercase`;
      case "upper":
        return t`Spaces trimmed, UPPERCASE`;
    }
  };
}

/** Translates a conversion into a short phrase. */
function useConvertDescriber(): (convert: CrosswalkMapping.Convert) => string {
  const { t, i18n } = useLingui();
  const describeTrim = useTrimDescriber();
  return (convert) => {
    switch (convert.kind) {
      case "parse_date": {
        const format = toDateFormatLabel(convert.format);
        return t`Read as a date (${format})`;
      }
      case "pad_text": {
        const length = i18n.number(convert.length);
        return t`Padded with zeros to ${length}`;
      }
      case "multiply": {
        const factor = i18n.number(convert.factor, {
          maximumFractionDigits: 6,
        });
        return t`Multiplied by ${factor}`;
      }
      case "trim_and_fix_case":
        return describeTrim(convert.letterCase);
    }
  };
}

/**
 * A function describing a fill for the Filled from cell: the source
 * column and its conversion or code list, a fixed value, a Combine
 * expression, or Leave empty. Code lists are named from
 * `codeListNamesById`. A list no longer there is said to be deleted.
 */
export function useFillSummary(
  codeListNamesById: ReadonlyMap<string, string>,
): (fill: CrosswalkMapping.Fill) => FillSummary {
  const { t } = useLingui();
  const describeConvert = useConvertDescriber();
  return (fill) => {
    if (fill.kind === "constant") {
      return { main: fill.value, detail: t`Fixed value`, isEmpty: false };
    }
    if (fill.kind === "expression") {
      return { main: fill.sql, detail: t`Combine`, isEmpty: false };
    }
    if (fill.kind === "empty") {
      return { main: t`Leave empty`, detail: undefined, isEmpty: true };
    }
    const codeListName = fill.codeListId
      ? codeListNamesById.get(fill.codeListId)
      : undefined;
    const translation = !fill.codeListId
      ? undefined
      : codeListName
        ? t`Translated with ${codeListName}`
        : t`Translated with a code list that was deleted`;
    return {
      main: fill.sourceColumn,
      detail: fill.convert ? describeConvert(fill.convert) : translation,
      isEmpty: false,
    };
  };
}
