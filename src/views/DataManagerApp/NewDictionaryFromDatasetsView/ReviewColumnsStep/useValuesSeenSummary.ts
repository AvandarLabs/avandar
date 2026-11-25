import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";

/** How many of a coded entry's values the cell spells out. */
const MAX_SHOWN_VALUES = 6;

/**
 * One line saying what an entry's columns hold: its first values, a range,
 * or how many different values it has.
 */
export function useValuesSeenSummary(entry: DictionaryProposal.Entry): string {
  const { t, i18n } = useLingui();
  const values = DictionaryProposal.getValuesSeen(entry);
  const range = DictionaryProposal.getNumberRange(entry);
  if (entry.kind === "identifier") {
    return t`Unique per row`;
  }
  if (entry.kind === "date") {
    return t`Dates`;
  }
  if (values.length > 0) {
    const shown = values
      .slice(0, MAX_SHOWN_VALUES)
      .map((item) => {
        return item.value;
      })
      .join(", ");
    const moreCount = values.length - MAX_SHOWN_VALUES;
    return moreCount > 0
      ? plural(moreCount, {
          one: `${shown} and # more`,
          other: `${shown} and # more`,
        })
      : shown;
  }
  if (range) {
    const lowest = i18n.number(range.min);
    const highest = i18n.number(range.max);
    return t`${lowest} to ${highest}`;
  }
  const distinctCount = Math.max(
    0,
    ...DictionaryProposal.getColumns(entry).map((column) => {
      return column.distinctCount;
    }),
  );
  return plural(distinctCount, {
    one: "# different value",
    other: "# different values",
  });
}
