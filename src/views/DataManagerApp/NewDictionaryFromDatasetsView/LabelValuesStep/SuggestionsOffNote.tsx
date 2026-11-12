import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { ReactNode } from "react";

type Props = {
  availability: DictionarySuggestionAvailability;
  /** Why this list's values cannot be sent, when they cannot. */
  blockReason: LabelsBlockReason | undefined;
};

function _getNote(options: Readonly<Props>): ReactNode {
  const { availability, blockReason } = options;
  if (availability === "unavailable") {
    return (
      <Trans>
        Suggestions need a connection or the offline model. Labeling still
        works.
      </Trans>
    );
  }
  if (availability === "declined") {
    return (
      <Trans>
        You chose not to send values to the AI provider, so suggestions are off
        for this dictionary. Labeling still works.
      </Trans>
    );
  }
  if (blockReason === "personal") {
    return (
      <Trans>
        These columns look like they name people, so their values are not sent
        for suggestions.
      </Trans>
    );
  }
  if (blockReason === "code_too_long") {
    return (
      <Trans>
        A value in this list is too long to send for suggestions. Labeling still
        works.
      </Trans>
    );
  }
  if (blockReason === "too_large_for_model") {
    return (
      <Trans>
        This list is too long to suggest labels for in one request. Labeling
        still works.
      </Trans>
    );
  }
  return null;
}

/** Why Suggest labels is off for this list, as one line, or nothing. */
export function SuggestionsOffNote(props: Readonly<Props>): ReactNode {
  const note = _getNote(props);
  return note ? (
    <Text size="xs" c="dimmed">
      {note}
    </Text>
  ) : null;
}
