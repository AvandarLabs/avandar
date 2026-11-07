import { Trans } from "@lingui/react/macro";
import { Alert, Anchor, Code, Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import { QueryErrorKind } from "@/lib/sql/QueryErrorKind/QueryErrorKind";
import { useQueryErrorExplanation } from "@/views/DataExplorerApp/useQueryErrorExplanation/useQueryErrorExplanation";
import type { ReactNode } from "react";

type Props = {
  /** The last query error, or `undefined` when the query succeeded. */
  message: string | undefined;
  /** The SQL that failed, shown on request. */
  sql: string | undefined;
};

/**
 * Reports a failed query where the results would otherwise be.
 *
 * This alert replaces the results area so a conversion or binder failure is
 * not shown as an empty grid. It explains the failure in plain language and
 * keeps the technical message and the SQL behind disclosures.
 */
export function QueryResultsError({ message, sql }: Props): ReactNode {
  const [isDetailsOpen, { toggle: toggleDetails }] = useDisclosure(false);
  const [isSqlOpen, { toggle: toggleSql }] = useDisclosure(false);
  const explanation = useQueryErrorExplanation(message);

  if (message === undefined) {
    return null;
  }

  return (
    <Alert
      role="alert"
      color="red"
      variant="light"
      icon={<IconAlertTriangle size={16} />}
      title={<Trans>This query could not run</Trans>}
    >
      <Stack gap="xs">
        <span>{explanation}</span>
        <Group gap="md">
          <Anchor
            component="button"
            type="button"
            size="sm"
            aria-expanded={isDetailsOpen}
            onClick={toggleDetails}
          >
            {isDetailsOpen ? (
              <Trans>Hide details</Trans>
            ) : (
              <Trans>Show details</Trans>
            )}
          </Anchor>
          {sql ? (
            <Anchor
              component="button"
              type="button"
              size="sm"
              aria-expanded={isSqlOpen}
              onClick={toggleSql}
            >
              {isSqlOpen ? <Trans>Hide SQL</Trans> : <Trans>Show SQL</Trans>}
            </Anchor>
          ) : null}
        </Group>
        {isDetailsOpen ? (
          <Code block>{QueryErrorKind.toTechnicalDetails(message)}</Code>
        ) : null}
        {isSqlOpen && sql ? <Code block>{sql}</Code> : null}
      </Stack>
    </Alert>
  );
}
