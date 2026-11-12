import { useLingui } from "@lingui/react/macro";
import { Checkbox, Table, Text } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { EntryKindSelect } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/EntryKindSelect";
import { EntryNameCell } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/EntryNameCell";
import { KeepApartButton } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/KeepApartButton";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { ValuesSeenCell } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ValuesSeenCell";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  sharedWithNames: readonly string[];
  nameIssue: DictionaryProposal.EntryNameIssue | undefined;
  /** One dataset needs no dataset names after each column. */
  isSingleDataset: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * One proposed entry on the Review step: include it or not, rename it, see
 * where it came from, change its kind, and undo a guessed merge. The last
 * cell says what comes next for it, labels or only a description.
 */
export function ReviewEntryRow({
  entry,
  sharedWithNames,
  nameIssue,
  isSingleDataset,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entryName = entry.name;
  const isCoded = DataDictionary.isCodedKind(entry.kind);

  return (
    <Table.Tr className={css.reviewEntryRow} data-included={entry.isIncluded}>
      <Table.Td>
        <Checkbox
          aria-label={t`Include ${entryName}`}
          checked={entry.isIncluded}
          onChange={(event) => {
            const isIncluded = event.currentTarget.checked;
            dispatch({
              type: "set_entry_included",
              entryKey: entry.key,
              isIncluded,
            });
          }}
        />
      </Table.Td>
      <EntryNameCell
        entry={entry}
        nameIssue={nameIssue}
        isSingleDataset={isSingleDataset}
        dispatch={dispatch}
      />
      <Table.Td>
        <EntryKindSelect entry={entry} dispatch={dispatch} />
      </Table.Td>
      <Table.Td>
        <ValuesSeenCell entry={entry} sharedWithNames={sharedWithNames} />
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {isCoded ? t`Needs labels` : t`Description`}
        </Text>
        <KeepApartButton entry={entry} dispatch={dispatch} />
      </Table.Td>
    </Table.Tr>
  );
}
