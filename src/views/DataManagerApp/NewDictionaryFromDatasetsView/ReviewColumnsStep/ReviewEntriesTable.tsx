import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { getSharedNamesByEntryKey } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/reviewEntriesHelpers";
import { ReviewEntriesTableHead } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntriesTableHead";
import { ReviewEntryRow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryRow";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** A stable empty list, so rows that share nothing keep one prop value. */
const NO_SHARED_NAMES: readonly string[] = [];

/**
 * Every proposed entry in one table, in the order the datasets were read.
 * An entry stays in its row when its kind changes, so it never seems to
 * disappear into another group.
 */
export function ReviewEntriesTable({
  proposal,
  nameIssues,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sharedNamesByEntryKey = useMemo(() => {
    return getSharedNamesByEntryKey(proposal);
  }, [proposal]);
  const isSingleDataset =
    DictionaryProposal.getDatasetIds(proposal).length === 1;
  const { entries } = proposal;
  const includedCount = entries.filter((entry) => {
    return entry.isIncluded;
  }).length;

  return (
    <AppViewSection
      title={t`Entries`}
      meta={plural(entries.length, { one: "# entry", other: "# entries" })}
    >
      <Table verticalSpacing="xs" layout="fixed">
        <ReviewEntriesTableHead
          includedCount={includedCount}
          entryCount={entries.length}
          dispatch={dispatch}
        />
        <Table.Tbody>
          {entries.map((entry) => {
            return (
              <ReviewEntryRow
                key={entry.key}
                entry={entry}
                sharedWithNames={
                  sharedNamesByEntryKey.get(entry.key) ?? NO_SHARED_NAMES
                }
                nameIssue={nameIssues.get(entry.key)}
                isSingleDataset={isSingleDataset}
                dispatch={dispatch}
              />
            );
          })}
        </Table.Tbody>
      </Table>
    </AppViewSection>
  );
}
