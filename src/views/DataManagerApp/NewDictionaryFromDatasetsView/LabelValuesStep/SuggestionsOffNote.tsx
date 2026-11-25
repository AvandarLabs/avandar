import { plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { ReactNode } from "react";

type Props = {
  availability: DictionarySuggestionAvailability;
  /** Why this list's values cannot be sent, when they cannot. */
  blockReason: LabelsBlockReason | undefined;
  /** How many values the list holds. */
  valueCount: number;
};

function _getNote(options: Readonly<Props>): ReactNode {
  const { availability, blockReason } = options;
  if (availability === "unavailable") {
    return (
      <Trans>
        Suggestions need a connection or the offline model. You can still map
        values yourself.
      </Trans>
    );
  }
  if (availability === "declined") {
    return (
      <Trans>
        You chose not to send values to the AI provider, so suggestions are off
        for this dictionary. You can still map values yourself.
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
        A value in this list is too long to send for suggestions. You can still
        map values yourself.
      </Trans>
    );
  }
  if (blockReason === "too_large_for_model") {
    return (
      <Trans>
        This list is too long to suggest target values for in one request. You
        can still map values yourself.
      </Trans>
    );
  }
  if (options.valueCount > ColumnProfile.MAX_LISTED_VALUES) {
    return plural(ColumnProfile.MAX_LISTED_VALUES, {
      one: "Suggestions cover the first # value.",
      other: "Suggestions cover the first # values.",
    });
  }
  return null;
}

/**
 * Why Suggest labels is off for this list, or that suggestions cover only
 * its first values, as one line, or nothing.
 */
export function SuggestionsOffNote(props: Readonly<Props>): ReactNode {
  const note = _getNote(props);
  return note ? (
    <Text size="xs" c="dimmed">
      {note}
    </Text>
  ) : null;
}
