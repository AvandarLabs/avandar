import { useMemo } from "react";
import {
  getMatchCaseByIdFromFilterGroup,
  makeLibraryFilterGroupFromQueryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";

type FilterTreeState = {
  query: LibraryGroup;
  matchCaseById: Record<string, boolean>;
  onQueryChange: () => void;
  commitNow: () => void;
  setMatchCase: () => void;
};

/**
 * The film supplies the entire filter tree per frame; no timers or user commits
 * run.
 */
export function useFilterTreeState({
  value,
}: {
  value: StructuredQuery.FilterGroup;
}): FilterTreeState {
  return useMemo(() => {
    return {
      query: makeLibraryFilterGroupFromQueryFilterGroup(value),
      matchCaseById: getMatchCaseByIdFromFilterGroup(value),
      onQueryChange: () => {},
      commitNow: () => {},
      setMatchCase: () => {},
    };
  }, [value]);
}
