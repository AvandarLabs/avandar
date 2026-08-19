import { useCallback, useEffect, useRef } from "react";
import { makeQueryFilterGroupFromLibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import type { QueryFilterColumnTypes } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";

/** Milliseconds of quiet before a typed value is committed upward. */
const COMMIT_DEBOUNCE_MS = 300;

type Options = {
  /** Live column types, used to stamp each rule's data type on commit. */
  columnTypes: QueryFilterColumnTypes;
  onChange: (nextFilterGroup: StructuredQuery.FilterGroup) => void;
  /** The tree the parent already has, which is the first commit baseline. */
  initialValue: StructuredQuery.FilterGroup;
};

type DebouncedFilterCommit = {
  /** Converts and sends a tree upward at once. */
  commitNow: (
    nextLibraryGroup: LibraryGroup,
    matchCaseById: Readonly<Record<string, boolean>>,
  ) => void;
  /** Sends a tree upward once the user stops typing. */
  commitSoon: (
    nextLibraryGroup: LibraryGroup,
    matchCaseById: Readonly<Record<string, boolean>>,
  ) => void;
  /** Drops a commit that is still waiting out the debounce. */
  cancelPendingCommit: () => void;
  /** The last tree sent upward, so the parent's echo can be recognised. */
  getLastCommitted: () => StructuredQuery.FilterGroup;
  /**
   * Records a tree as already committed without sending it. Adopting a tree the
   * parent replaced makes it the new baseline: the parent already has it.
   */
  setLastCommitted: (value: StructuredQuery.FilterGroup) => void;
};

/**
 * Owns when an edited filter tree is sent upward.
 *
 * Typing is debounced so a query does not run per keystroke, and every other
 * edit commits at once. Both paths convert the library's tree into our shape
 * against the newest `columnTypes` and `onChange`, which a debounced commit
 * cannot capture at schedule time without going stale.
 */
export function useDebouncedFilterCommit({
  columnTypes,
  onChange,
  initialValue,
}: Options): DebouncedFilterCommit {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const committedRef = useRef<StructuredQuery.FilterGroup>(initialValue);

  // Latest-value refs. A commit scheduled 300ms ago must still convert against
  // the current column types and call the current handler, so neither can be
  // captured in the timer's closure.
  const columnTypesRef = useRef(columnTypes);
  const onChangeRef = useRef(onChange);
  useEffect(function trackLatestCommitInputs() {
    columnTypesRef.current = columnTypes;
    onChangeRef.current = onChange;
  });

  useEffect(function clearTimerOnUnmount() {
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const cancelPendingCommit = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const commitNow = useCallback(
    (
      nextLibraryGroup: LibraryGroup,
      matchCaseById: Readonly<Record<string, boolean>>,
    ) => {
      cancelPendingCommit();
      const internal = makeQueryFilterGroupFromLibraryGroup({
        group: nextLibraryGroup,
        columnTypes: columnTypesRef.current,
        matchCaseById,
      });
      committedRef.current = internal;
      onChangeRef.current(internal);
    },
    [cancelPendingCommit],
  );

  const commitSoon = useCallback(
    (
      nextLibraryGroup: LibraryGroup,
      matchCaseById: Readonly<Record<string, boolean>>,
    ) => {
      cancelPendingCommit();
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        commitNow(nextLibraryGroup, matchCaseById);
      }, COMMIT_DEBOUNCE_MS);
    },
    [cancelPendingCommit, commitNow],
  );

  const getLastCommitted = useCallback(() => {
    return committedRef.current;
  }, []);

  const setLastCommitted = useCallback((value: StructuredQuery.FilterGroup) => {
    committedRef.current = value;
  }, []);

  return {
    commitNow,
    commitSoon,
    cancelPendingCommit,
    getLastCommitted,
    setLastCommitted,
  };
}
