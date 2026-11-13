import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Stack, Text } from "@mantine/core";
import type { DictionaryUsageRow } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  row: DictionaryUsageRow;
  currentVersion: number;
  /** Shown under a status that is behind, such as Re-apply. */
  action?: ReactNode;
};

/**
 * The Used by tab's Status cell: "Up to date", or the version a dataset
 * changed in place was given beside the dictionary's current one, with
 * `action` under it.
 */
export function UsageStatusCell({
  row,
  currentVersion,
  action,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  if (!row.isBehind || row.appliedVersion === undefined) {
    return (
      <Badge size="sm" variant="light" color="success" tt="none">
        <Trans>Up to date</Trans>
      </Badge>
    );
  }
  const appliedVersion = i18n.number(row.appliedVersion);
  const nowVersion = i18n.number(currentVersion);
  return (
    <Stack gap={4} align="flex-start">
      <Text size="xs" c="warning">
        <Trans>
          Applied version {appliedVersion}, now version {nowVersion}
        </Trans>
      </Text>
      {action}
    </Stack>
  );
}
