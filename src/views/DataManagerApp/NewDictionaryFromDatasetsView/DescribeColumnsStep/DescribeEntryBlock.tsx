import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Stack, Text, Textarea } from "@mantine/core";
import { useId } from "react";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeColumnsStep.module.css";
import { SuggestEntryButton } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/SuggestEntryButton";
import { buildEntrySourcesText } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/reviewEntriesHelpers";
import { useValuesSeenSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/useValuesSeenSummary";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type {
  DescriptionSuggestionStatus,
  SuggestDescriptionsOptions,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestDescriptions";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** One dataset needs no dataset names after each column. */
  isSingleDataset: boolean;
  status: DescriptionSuggestionStatus | undefined;
  /** Suggestions are off, or one is running, so none can start now. */
  isSuggestOff: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (options: SuggestDescriptionsOptions) => void;
};

/**
 * One entry on the Describe columns step: its name, where its column came
 * from, its kind, a few of the values it holds, and a box for its
 * description with its own Suggest button. A suggested description says so
 * until the user edits it, and a suggestion that did not come back says so
 * on the entry.
 */
export function DescribeEntryBlock({
  entry,
  isSingleDataset,
  status,
  isSuggestOff,
  dispatch,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const nameId = useId();
  const valuesSeen = useValuesSeenSummary(entry);
  const entryName = entry.name;
  const sources = buildEntrySourcesText(entry, isSingleDataset);

  return (
    <li className={css.describeEntry}>
      <Stack gap="xs" role="group" aria-labelledby={nameId}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap="xxs" miw={0}>
            <Text component="h5" id={nameId} fw={600} m={0} lh={1.4}>
              {entry.name}
            </Text>
            <Text size="xs" c="dimmed">
              {copy.kindShortLabels[entry.kind]} · {sources}
            </Text>
            <Text size="xs" c="dimmed" lineClamp={2}>
              {valuesSeen}
            </Text>
          </Stack>
          <SuggestEntryButton
            entry={entry}
            isPending={status === "pending"}
            isOff={isSuggestOff}
            onSuggest={onSuggest}
          />
        </Group>
        <Textarea
          aria-label={t`Description of ${entryName}`}
          description={
            entry.isDescriptionSuggested
              ? t`Suggested from the column. Edit it or keep it.`
              : undefined
          }
          inputWrapperOrder={["input", "description"]}
          autosize
          minRows={2}
          maxRows={10}
          value={entry.description}
          onChange={(event) => {
            const description = event.currentTarget.value;
            dispatch({
              type: "set_entry_description",
              entryKey: entry.key,
              description,
            });
          }}
        />
        <div aria-live="polite">
          {status === "failed" ? (
            <Text size="xs" c="dimmed">
              <Trans>
                The suggestion did not come back. Try again or write it
                yourself.
              </Trans>
            </Text>
          ) : null}
        </div>
      </Stack>
    </li>
  );
}
