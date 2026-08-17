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
 * A DuckDB conversion or binder error used to leave the grid saying
 * "No Rows To Show", which is indistinguishable from a filter that legitimately
 * matches nothing.
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
        {sql ?
          <>
            <Anchor
              component="button"
              type="button"
              size="sm"
              onClick={toggleSql}
            >
              {isSqlOpen ?
                <Trans>Hide SQL</Trans>
              : <Trans>Show SQL</Trans>}
            </Anchor>
            {/*
             * Mounted only while open rather than collapsed in place: a failing
             * query's SQL is long, and keeping it in the DOM makes it findable
             * (and readable by screen readers) when the user has not asked for
             * it.
             */}
            {isSqlOpen ?
              <Code block>{sql}</Code>
            : null}
          </>
        : null}
      </Stack>
    </Alert>
  );
}
