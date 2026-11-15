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

function UpToDateBadge(): ReactNode {
  return (
    <Badge size="sm" variant="light" color="success" tt="none">
      <Trans>Up to date</Trans>
    </Badge>
  );
}

function BehindStatus({
  children,
  action,
}: Readonly<{ children: ReactNode; action: ReactNode }>): ReactNode {
  return (
    <Stack gap={4} align="flex-start">
      <Text size="xs" fw={500}>
        {children}
      </Text>
      {action}
    </Stack>
  );
}

/**
 * The Used by tab's Status cell: "Up to date"; for a dataset changed in
 * place, the version it was given beside the dictionary's current one;
 * for a crosswalk's combined dataset, that a code list changed since it
 * was combined. `action` goes under a status that is behind.
 */
export function UsageStatusCell({
  row,
  currentVersion,
  action,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  if (row.howApplied === "crosswalk") {
    return row.isBehind ? (
      <BehindStatus action={action}>
        <Trans>A code list changed since it was combined</Trans>
      </BehindStatus>
    ) : (
      <UpToDateBadge />
    );
  }
  if (!row.isBehind || row.appliedVersion === undefined) {
    return <UpToDateBadge />;
  }
  const appliedVersion = i18n.number(row.appliedVersion);
  const nowVersion = i18n.number(currentVersion);
  return (
    <BehindStatus action={action}>
      <Trans>
        Applied version {appliedVersion}, now version {nowVersion}
      </Trans>
    </BehindStatus>
  );
}
