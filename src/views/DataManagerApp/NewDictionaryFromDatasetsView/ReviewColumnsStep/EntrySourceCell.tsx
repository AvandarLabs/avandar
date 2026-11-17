import { Table, Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import type { ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** One dataset needs no dataset names after each column. */
  isSingleDataset: boolean;
};

function _formatSources(
  entry: DictionaryProposal.Entry,
  isSingleDataset: boolean,
): string {
  return DictionaryProposal.getColumnSources(entry)
    .map(({ columnName, datasetNames }) => {
      return isSingleDataset
        ? columnName
        : `${columnName} (${datasetNames.join(", ")})`;
    })
    .join(", ");
}

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
          {_formatSources(entry, isSingleDataset)}
        </Text>
      </div>
    </Table.Td>
  );
}
