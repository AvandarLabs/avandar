import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import type { ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** Other entries that share this entry's code list. */
  sharedWithNames: readonly string[];
};

/** How many of a coded entry's values the cell spells out. */
const MAX_SHOWN_VALUES = 6;

/** One line saying what an entry's columns hold. */
function useValuesSeenSummary(entry: DictionaryProposal.Entry): string {
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

/**
 * What an entry's columns hold, and a note when the entry joined columns
 * with other codes or shares its code list with other entries.
 */
export function ValuesSeenCell({
  entry,
  sharedWithNames,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const summary = useValuesSeenSummary(entry);
  const sharedList = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(sharedWithNames);

  return (
    <>
      <Text size="sm" lineClamp={1} className={css.reviewEntryText}>
        {summary}
      </Text>
      {entry.suggestionReason === "other_codes" ? (
        <Text size="xs" c="dimmed">
          <Trans>
            Same name, different codes. Kept as separate code lists under one
            entry.
          </Trans>
        </Text>
      ) : null}
      {sharedWithNames.length > 0 ? (
        <Text size="xs" c="dimmed">
          {t`Shares one code list with ${sharedList}.`}
        </Text>
      ) : null}
    </>
  );
}
