import { matchLiteral } from "@avandar/utils";
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

/** Translates a conversion into a short phrase. */
function useConvertDescriber(): (convert: CrosswalkMapping.Convert) => string {
  const { t, i18n } = useLingui();
  return (convert) => {
    return matchLiteral(convert.kind, {
      parse_date: () => {
        const format = toDateFormatLabel(
          convert.kind === "parse_date" ? convert.format : "",
        );
        return t`Read as a date (${format})`;
      },
      pad_text: () => {
        const length = i18n.number(
          convert.kind === "pad_text" ? convert.length : 0,
        );
        return t`Padded with zeros to ${length}`;
      },
      multiply: () => {
        const factor = i18n.number(
          convert.kind === "multiply" ? convert.factor : 1,
          {
            maximumFractionDigits: 6,
          },
        );
        return t`Multiplied by ${factor}`;
      },
      trim_and_fix_case: () => {
        const letterCase =
          convert.kind === "trim_and_fix_case" ? convert.letterCase : "keep";
        return matchLiteral(letterCase, {
          keep: () => {
            return t`Spaces trimmed`;
          },
          lower: () => {
            return t`Spaces trimmed, lowercase`;
          },
          upper: () => {
            return t`Spaces trimmed, UPPERCASE`;
          },
        });
      },
    });
  };
}

/**
 * A function describing a fill for the Filled from cell: the source
 * column and its conversion or code list, a fixed value, a Combine
 * expression, or Leave empty. Code lists are named from
 * `codeListNamesById`; a list no longer there is said to be deleted.
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
