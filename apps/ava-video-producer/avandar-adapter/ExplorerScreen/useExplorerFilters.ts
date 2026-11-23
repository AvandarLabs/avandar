import { propEq } from "@avandar/utils";
import { useMemo } from "react";
import { EXPLORER_COLUMNS } from "../Explorer.constants";
import { emptyFilter } from "./ExplorerTimeline";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ExplorerTimeline } from "./ExplorerTimeline";
/** Memoize the authored district filter with the product query contract. */
export function useExplorerFilters({
  stage,
}: Readonly<{
  stage: ReturnType<typeof ExplorerTimeline.getStageFromFrame>;
}>): StructuredQuery.FilterGroup {
  const filters: StructuredQuery.FilterGroup = useMemo(() => {
    return stage.hasFilterRule
      ? {
          ...emptyFilter,
          rules: [
            {
              type: "rule",
              id: "demo-district-filter",
              columnId: EXPLORER_COLUMNS.find(
                propEq("baseColumn.name", stage.filterColumn),
              )!.id,
              columnDataType: "varchar",
              operator: "=",
              value: stage.filterText,
            },
          ],
        }
      : emptyFilter;
  }, [stage.hasFilterRule, stage.filterText, stage.filterColumn]);
  return filters;
}
