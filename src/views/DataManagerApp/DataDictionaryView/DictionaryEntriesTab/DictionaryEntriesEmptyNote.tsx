import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  hasEntries: boolean;
  filter: string;
};

/** Explains an empty table: no entries yet, or none match the filter. */
export function DictionaryEntriesEmptyNote({
  hasEntries,
  filter,
}: Readonly<Props>): ReactNode {
  return (
    <Text c="dimmed" size="sm">
      {hasEntries ? (
        <Trans>
          No entries match “{filter}”. Entries match on their own name and on
          every column name they also match.
        </Trans>
      ) : (
        <Trans>
          No entries yet. Add one for each kind of column this dictionary
          describes.
        </Trans>
      )}
    </Text>
  );
}
