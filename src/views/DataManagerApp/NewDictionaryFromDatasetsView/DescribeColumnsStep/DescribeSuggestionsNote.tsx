import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { ReactNode } from "react";

type Props = {
  availability: DictionarySuggestionAvailability;
};

/**
 * Why every Suggest button on the Describe columns step is off, as one
 * line, or nothing while suggestions can run.
 */
export function DescribeSuggestionsNote({
  availability,
}: Readonly<Props>): ReactNode {
  if (availability === "unavailable") {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          Suggestions need a connection or the offline model. You can still
          write the descriptions yourself.
        </Trans>
      </Text>
    );
  }
  if (availability === "declined") {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          You chose not to send column details to the AI provider, so
          suggestions are off for this dictionary. You can still write the
          descriptions yourself.
        </Trans>
      </Text>
    );
  }
  return null;
}
