import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { DescribeColumnsFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeColumnsFooter";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeColumnsStep.module.css";
import { DescribeEntryBlock } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeEntryBlock";
import { DescribeSuggestionsNote } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeSuggestionsNote";
import { NothingToDescribe } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/NothingToDescribe";
import { SuggestAllButton } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/SuggestAllButton";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type {
  DescriptionSuggestionProgress,
  DescriptionSuggestionStatus,
  SuggestDescriptionsOptions,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestDescriptions";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  suggestionAvailability: DictionarySuggestionAvailability;
  /** Back goes to Map values when there were values to map, else Review. */
  hasValuesToMap: boolean;
  statusByEntryKey: ReadonlyMap<string, DescriptionSuggestionStatus>;
  /** A run of suggestions is going, so no other can start. */
  isSuggesting: boolean;
  /** Set only while a run of several entries is going. */
  progress: DescriptionSuggestionProgress | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (options: SuggestDescriptionsOptions) => void;
};

/**
 * The fourth step of learning a dictionary: a description for every included
 * entry, including the ones with no value list to map. Each entry has its
 * own Suggest button, and Suggest all fills the rest. Descriptions can be
 * left empty and written on the dictionary later.
 */
export function DescribeColumnsStep({
  proposal,
  suggestionAvailability,
  hasValuesToMap,
  statusByEntryKey,
  isSuggesting,
  progress,
  dispatch,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entries = proposal.entries.filter((entry) => {
    return entry.isIncluded;
  });
  const isSingleDataset =
    DictionaryProposal.getDatasetIds(proposal).length === 1;
  const doneCount = progress?.done ?? 0;
  const totalCount = progress?.total ?? 0;
  const isOff =
    suggestionAvailability === "unavailable" ||
    suggestionAvailability === "declined" ||
    isSuggesting;

  return (
    <>
      <AppViewBody>
        {entries.length === 0 ? (
          <NothingToDescribe />
        ) : (
          <AppViewSection
            title={t`Descriptions`}
            meta={plural(entries.length, {
              one: "# entry",
              other: "# entries",
            })}
            actions={
              <SuggestAllButton
                entries={entries}
                isOff={isOff}
                onSuggest={onSuggest}
              />
            }
          >
            <Stack gap="md">
              <DescribeSuggestionsNote availability={suggestionAvailability} />
              <div aria-live="polite">
                {progress ? (
                  <Text size="sm" c="dimmed">
                    {t`Suggested ${doneCount} of ${totalCount}`}
                  </Text>
                ) : null}
              </div>
              <ul className={css.describeEntryList}>
                {entries.map((entry) => {
                  return (
                    <DescribeEntryBlock
                      key={entry.key}
                      entry={entry}
                      isSingleDataset={isSingleDataset}
                      status={statusByEntryKey.get(entry.key)}
                      isSuggestOff={isOff}
                      dispatch={dispatch}
                      onSuggest={onSuggest}
                    />
                  );
                })}
              </ul>
            </Stack>
          </AppViewSection>
        )}
      </AppViewBody>
      <DescribeColumnsFooter
        hasValuesToMap={hasValuesToMap}
        hasIncludedEntry={entries.length > 0}
        dispatch={dispatch}
      />
    </>
  );
}
