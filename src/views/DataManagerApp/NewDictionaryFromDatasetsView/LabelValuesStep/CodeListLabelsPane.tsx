import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { EntryDescriptionField } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/EntryDescriptionField";
import { LabelValuesTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesTable";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch, ReactNode } from "react";

type Props = {
  codeList: DictionaryProposal.CodeList;
  /** The entries that use the list. */
  entries: readonly DictionaryProposal.Entry[];
  labels: DictionaryProposal.Labels;
  suggestionAvailability: DictionarySuggestionAvailability;
  isSuggesting: boolean;
  /** False when the list's columns look like they name people. */
  canSuggest: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/** One sentence on how to label this list. */
function useCodeListHint(
  codeList: DictionaryProposal.CodeList,
  entries: readonly DictionaryProposal.Entry[],
): string {
  const { t, i18n } = useLingui();
  if (entries.length > 1) {
    const names = new Intl.ListFormat(i18n.locale, {
      type: "conjunction",
    }).format(
      entries.map((entry) => {
        return entry.name;
      }),
    );
    return t`${names} hold the same values, so they share this one list. Label it once.`;
  }
  return codeList.isOrdered
    ? t`This list is ordered, lowest level first. Reorder it on the dictionary after saving if the order is wrong.`
    : t`Give each value the label people should see. Suggestions are only a starting point.`;
}

/** Why Suggest labels is off for this list, as one line, or nothing. */
function SuggestionsOffNote({
  availability,
  canSuggest,
}: Readonly<{
  availability: DictionarySuggestionAvailability;
  canSuggest: boolean;
}>): ReactNode {
  if (availability === "unavailable") {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          Suggestions need a connection or the offline model. Labeling still
          works.
        </Trans>
      </Text>
    );
  }
  if (availability === "declined") {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          You chose not to send values to the AI provider, so suggestions are
          off for this dictionary. Labeling still works.
        </Trans>
      </Text>
    );
  }
  if (!canSuggest) {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          These columns look like they name people, so their values are not sent
          for suggestions.
        </Trans>
      </Text>
    );
  }
  return null;
}

/** The selected code list: its values to label and Suggest labels. */
export function CodeListLabelsPane({
  codeList,
  entries,
  labels,
  suggestionAvailability,
  isSuggesting,
  canSuggest,
  dispatch,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const hint = useCodeListHint(codeList, entries);
  const [onlyEntry] = entries.length === 1 ? entries : [];
  const isOff =
    suggestionAvailability === "unavailable" ||
    suggestionAvailability === "declined";

  return (
    <Stack gap="md" miw={0}>
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Title order={4} fz="lg" fw={650}>
          {codeList.name}
        </Title>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconSparkles size={14} aria-hidden />}
          loading={isSuggesting}
          disabled={isOff || !canSuggest}
          onClick={() => {
            onSuggest(codeList);
          }}
        >
          <Trans>Suggest labels</Trans>
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        {hint}
      </Text>
      <SuggestionsOffNote
        availability={suggestionAvailability}
        canSuggest={canSuggest}
      />
      <LabelValuesTable
        codeList={codeList}
        labels={labels}
        dispatch={dispatch}
      />
      {onlyEntry ? (
        <EntryDescriptionField entry={onlyEntry} dispatch={dispatch} />
      ) : null}
    </Stack>
  );
}
