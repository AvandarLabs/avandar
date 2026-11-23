import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";
import { EXPLORER_SELECTED_COLUMNS } from "../Explorer.constants";
import { ExplorerFilterFields } from "./ExplorerFilterFields";
import { ExplorerSortFields } from "./ExplorerSortFields";
import { ExplorerSourceFields } from "./ExplorerSourceFields";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

const _noop = () => {};
/** Assemble the four product query groups in their original display order. */
export function getExplorerManualGroups({
  filters,
  appliedFilters,
  query,
}: Readonly<{
  filters: StructuredQuery.FilterGroup;
  appliedFilters: StructuredQuery.FilterGroup;
  query: StructuredQuery.Partial;
}>): Array<{ id: string; title: string; content: ReactNode; span?: number }> {
  return [
    {
      id: "source",
      title: "Source",
      content: <ExplorerSourceFields />,
    },
    {
      id: "aggregations",
      title: "Aggregations",
      content: (
        <AggregationFields
          queryColumns={EXPLORER_SELECTED_COLUMNS}
          aggregations={{}}
          onSetColumnAggregation={_noop}
          withinPortal={false}
        />
      ),
    },
    {
      id: "filters",
      title: "Filters (Where)",
      span: 2,
      content: (
        <ExplorerFilterFields
          filters={filters}
          appliedFilters={appliedFilters}
        />
      ),
    },
    {
      id: "sort-limit",
      title: "Sort & limit",
      content: <ExplorerSortFields query={query} />,
    },
  ];
}
