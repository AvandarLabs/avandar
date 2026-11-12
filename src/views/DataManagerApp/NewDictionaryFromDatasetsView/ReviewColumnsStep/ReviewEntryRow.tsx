import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Checkbox,
  Group,
  Select,
  Table,
  Text,
} from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { ReviewEntryNameInput } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryNameInput";
import { SuggestedTag } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/SuggestedTag";
import { ValuesSeenCell } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ValuesSeenCell";
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
 * One proposed entry on the Review step: include it or not, rename it, see
 * where it came from, change its kind, and undo a guessed merge.
 */
export function ReviewEntryRow({
  entry,
  sharedWithNames,
  nameIssue,
  isSingleDataset,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const entryName = entry.name;
  const reason = entry.suggestionReason;

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
      <Table.Td>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Box flex={1} miw={0}>
            <ReviewEntryNameInput
              entry={entry}
              nameIssue={nameIssue}
              dispatch={dispatch}
            />
          </Box>
          {reason === "meaning" || reason === "similar_name" ? (
            <SuggestedTag reason={reason} />
          ) : null}
        </Group>
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {_formatSources(entry, isSingleDataset)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Select
          size="xs"
          aria-label={t`Kind for ${entryName}`}
          allowDeselect={false}
          value={entry.kind}
          data={DataDictionary.ENTRY_KINDS.map((kind) => {
            return { value: kind, label: copy.kindShortLabels[kind] };
          })}
          onChange={(value) => {
            const kind = DataDictionary.ENTRY_KINDS.find((current) => {
              return current === value;
            });
            if (kind) {
              dispatch({ type: "set_entry_kind", entryKey: entry.key, kind });
            }
          }}
        />
      </Table.Td>
      <Table.Td>
        <ValuesSeenCell entry={entry} sharedWithNames={sharedWithNames} />
      </Table.Td>
      <Table.Td>
        {entry.suggestedColumns.length > 0 ? (
          <Button
            variant="subtle"
            color="neutral"
            size="compact-xs"
            aria-label={t`Keep the columns in ${entryName} apart`}
            onClick={() => {
              dispatch({ type: "keep_apart", entryKey: entry.key });
            }}
          >
            <Trans>Keep apart</Trans>
          </Button>
        ) : null}
      </Table.Td>
    </Table.Tr>
  );
}
