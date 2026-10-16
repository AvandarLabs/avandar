import { useMemo } from "react";
import {
  getMatchCaseByIdFromFilterGroup,
  makeLibraryFilterGroupFromQueryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";

/** The film supplies the entire filter tree per frame; no timers or user commits run. */
export function useFilterTreeState({
  value,
}: {
  value: StructuredQuery.FilterGroup;
}) {
  return useMemo(
    () => ({
      query: makeLibraryFilterGroupFromQueryFilterGroup(value),
      matchCaseById: getMatchCaseByIdFromFilterGroup(value),
      onQueryChange: () => {},
      commitNow: () => {},
      setMatchCase: () => {},
    }),
    [value],
  );
}
