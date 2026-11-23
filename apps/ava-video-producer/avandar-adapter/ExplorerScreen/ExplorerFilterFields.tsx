import { Stack } from "@mantine/core";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { EXPLORER_COLUMNS } from "../Explorer.constants";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

type Props = {
  filters: StructuredQuery.FilterGroup;
  appliedFilters: StructuredQuery.FilterGroup;
};
const _noop = () => {};
/** Pair committed filter status with the draft product filter controls. */
export function ExplorerFilterFields({
  filters,
  appliedFilters,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xs">
      <AppliedFilterSummary filters={appliedFilters} />
      <QueryFiltersField
        columns={EXPLORER_COLUMNS}
        value={filters}
        onChange={_noop}
      />
    </Stack>
  );
}
