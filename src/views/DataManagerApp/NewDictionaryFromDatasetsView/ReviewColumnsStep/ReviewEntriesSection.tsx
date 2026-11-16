import { Table } from "@mantine/core";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { ReviewEntriesTableHead } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntriesTableHead";
import { ReviewEntryRow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryRow";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  title: string;
  meta: string;
  entries: readonly DictionaryProposal.Entry[];
  sharedNamesByEntryKey: ReadonlyMap<string, string[]>;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  isSingleDataset: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** A stable empty list, so rows that share nothing keep one prop value. */
const NO_SHARED_NAMES: readonly string[] = [];

/** One titled group of proposed entries. Hidden when it has none. */
export function ReviewEntriesSection({
  title,
  meta,
  entries,
  sharedNamesByEntryKey,
  nameIssues,
  isSingleDataset,
  dispatch,
}: Readonly<Props>): ReactNode {
  if (entries.length === 0) {
    return null;
  }
  return (
    <AppViewSection title={title} meta={meta}>
      <Table verticalSpacing="xs" layout="fixed">
        <ReviewEntriesTableHead />
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
