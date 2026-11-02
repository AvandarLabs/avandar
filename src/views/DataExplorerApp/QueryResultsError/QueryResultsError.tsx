import { Trans } from "@lingui/react/macro";
import { Alert, Anchor, Code, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
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
 * not shown as an empty grid.
 */
export function QueryResultsError({ message, sql }: Props): ReactNode {
  const [isSqlOpen, { toggle: toggleSql }] = useDisclosure(false);

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
        <span>{message}</span>
        {sql ? (
          <>
            <Anchor
              component="button"
              type="button"
              size="sm"
              aria-expanded={isSqlOpen}
              onClick={toggleSql}
            >
              {isSqlOpen ? <Trans>Hide SQL</Trans> : <Trans>Show SQL</Trans>}
            </Anchor>
            {isSqlOpen ? <Code block>{sql}</Code> : null}
          </>
        ) : null}
      </Stack>
    </Alert>
  );
}
