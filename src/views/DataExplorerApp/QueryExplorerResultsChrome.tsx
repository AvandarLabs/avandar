import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

import { Box, Group } from "@mantine/core";

import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { QueryResultsError } from "@/views/DataExplorerApp/QueryResultsError/QueryResultsError";

type Props = {
  lastQueryError: string | undefined;
  sql: string | undefined;
  filters: StructuredQuery.FilterGroup;
};

/**
 * Error alert and applied-filter counts above the results grid.
 *
 * The alert replaces the empty grid so a conversion or binder failure is not
 * shown as zero matches.
 */
export function QueryExplorerResultsChrome({
  lastQueryError,
  sql,
  filters,
}: Props): ReactNode {
  return (
    <>
      {lastQueryError !== undefined ? (
        <Box px="md" pb="xs" bg="var(--mantine-color-body)">
          <QueryResultsError message={lastQueryError} sql={sql} />
        </Box>
      ) : null}
      <Group justify="flex-end" px="md" bg="var(--mantine-color-body)">
        <AppliedFilterSummary filters={filters} isStatusRegion />
      </Group>
    </>
  );
}
