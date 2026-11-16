import { Box, Group, Table, Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { ReviewEntryNameInput } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryNameInput";
import { SuggestedTag } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/SuggestedTag";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  nameIssue: DictionaryProposal.EntryNameIssue | undefined;
  /** One dataset needs no dataset names after each column. */
  isSingleDataset: boolean;
  /** The id the Suggested tag gives its explanation, when it shows. */
  explanationId: string;
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
 * The cell that names a proposed entry: its editable name, a tag when its
 * columns were joined by a guess, and the columns it came from.
 */
export function EntryNameCell({
  entry,
  nameIssue,
  isSingleDataset,
  explanationId,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { suggestionReason } = entry;
  return (
    <Table.Td>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Box flex={1} miw={0}>
          <ReviewEntryNameInput
            entry={entry}
            nameIssue={nameIssue}
            dispatch={dispatch}
          />
        </Box>
        {suggestionReason === "meaning" ||
        suggestionReason === "similar_name" ? (
          <SuggestedTag
            reason={suggestionReason}
            explanationId={explanationId}
          />
        ) : null}
      </Group>
      <Text
        size="xs"
        c="dimmed"
        lineClamp={2}
        mt={4}
        className={css.reviewEntryText}
      >
        {_formatSources(entry, isSingleDataset)}
      </Text>
    </Table.Td>
  );
}
