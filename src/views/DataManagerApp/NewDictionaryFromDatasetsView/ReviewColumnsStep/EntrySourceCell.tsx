import { Table, Text } from "@mantine/core";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { buildEntrySourcesText } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/reviewEntriesHelpers";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** One dataset needs no dataset names after each column. */
  isSingleDataset: boolean;
};

/**
 * The columns a proposed entry came from, read-only. Datasets are named
 * after each column only when more than one was read.
 */
export function EntrySourceCell({
  entry,
  isSingleDataset,
}: Readonly<Props>): ReactNode {
  return (
    <Table.Td>
      <div className={css.reviewEntryLine}>
        <Text size="sm" lineClamp={2} className={css.reviewEntryText}>
          {buildEntrySourcesText(entry, isSingleDataset)}
        </Text>
      </div>
    </Table.Td>
  );
}
