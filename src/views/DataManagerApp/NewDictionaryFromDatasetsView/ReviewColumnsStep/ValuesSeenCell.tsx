import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { useValuesSeenSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/useValuesSeenSummary";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** Other entries that share this entry's code list. */
  sharedWithNames: readonly string[];
};

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
      <div className={css.reviewEntryLine}>
        <Text size="sm" lineClamp={1} className={css.reviewEntryText}>
          {summary}
        </Text>
      </div>
      {entry.suggestionReason === "other_codes" ? (
        <Text size="xs" c="dimmed">
          <Trans>
            Same name, different values. Kept as separate code lists under one
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
