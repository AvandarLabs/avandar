import { Box, Group, Table } from "@mantine/core";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { ReviewEntryNameInput } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryNameInput";
import { SuggestedTag } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/SuggestedTag";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  nameIssue: DictionaryProposal.EntryNameIssue | undefined;
  /** The id the Suggested tag gives its explanation, when it shows. */
  explanationId: string;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The cell that names a proposed entry: its editable name, and a tag when
 * its columns were joined by a guess.
 */
export function EntryNameCell({
  entry,
  nameIssue,
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
          <div className={css.reviewEntryLine}>
            <SuggestedTag
              reason={suggestionReason}
              explanationId={explanationId}
            />
          </div>
        ) : null}
      </Group>
    </Table.Td>
  );
}
