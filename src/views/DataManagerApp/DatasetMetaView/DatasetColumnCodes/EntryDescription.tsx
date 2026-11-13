import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  codes: ColumnCodes.T;
};

/**
 * A dictionary entry's description, shown for a column that has none of
 * its own, captioned with where it came from.
 */
export function EntryDescription({ codes }: Readonly<Props>): ReactNode {
  const { dictionaryName } = codes;
  return (
    <Stack gap={0}>
      <Text size="sm">{codes.description}</Text>
      <Text size="xs" c="dimmed">
        <Trans>From {dictionaryName}</Trans>
      </Text>
    </Stack>
  );
}
