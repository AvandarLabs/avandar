import { Trans } from "@lingui/react/macro";
import { sqlMappingReasonLabel } from "$/copy/sqlMappingReasonLabel";
import { sqlMappingReasonKey } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlMappingReason.types";
import { List, Stack, Text } from "@mantine/core";
import type { SqlMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlMappingReason.types";
import type { ReactNode } from "react";

type Props = {
  /** Reasons the manual form could not represent the current SQL. */
  syncWarnings: readonly SqlMappingReason[];
};

/**
 * Explains that the manual form is showing an approximation, and lists the
 * parts of the SQL it could not represent.
 */
export function SqlSyncWarningNotes({ syncWarnings }: Props): ReactNode {
  return (
    <Stack gap="xs" data-testid="sql-sync-warning">
      <Text size="xs">
        <Trans>
          Parts of this SQL could not be represented in the Manual form. The
          form shows a best-effort approximation; the SQL is what actually runs.
        </Trans>
      </Text>
      <List size="xs" spacing={2}>
        {syncWarnings.map((reason) => {
          return (
            <List.Item key={sqlMappingReasonKey(reason)}>
              {sqlMappingReasonLabel(reason)}
            </List.Item>
          );
        })}
      </List>
    </Stack>
  );
}
