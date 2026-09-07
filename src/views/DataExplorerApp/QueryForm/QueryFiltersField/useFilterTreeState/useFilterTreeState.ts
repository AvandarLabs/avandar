import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMatchCaseByIdFromFilterGroup,
  makeLibraryFilterGroupFromQueryFilterGroup,
  normalizeLibraryTree,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import { useDebouncedFilterCommit } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState/useDebouncedFilterCommit";
import type { QueryFilterColumnTypes } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";

/**
 * Everything about a tree except the values typed into it. Two trees with the
 * same signature differ only in what the user is typing, which is the one case
 * worth debouncing.
 */
function _structureSignature(group: LibraryGroup): string {
  const parts = group.rules.map((child) => {
    if ("rules" in child && "combinator" in child) {
      return _structureSignature(child);
    }
    return `${child.id ?? ""}:${child.field}:${child.operator}`;
  });
  return `${group.id ?? ""}:${group.combinator}(${parts.join(",")})`;
}

type Options = {
  /** The committed filter tree owned by the form. */
  value: StructuredQuery.FilterGroup;
  /** Live column types, used to stamp each rule's data type on commit. */
  columnTypes: QueryFilterColumnTypes;
  onChange: (nextFilterGroup: StructuredQuery.FilterGroup) => void;
};

type FilterTreeState = {
  /** The tree the query builder renders. Owned locally while editing. */
  query: LibraryGroup;
  /** Per-rule `Match case` state, keyed by rule id. */
  matchCaseById: Record<string, boolean>;
  /** Debounced commit, for value typing. */
  onQueryChange: (nextLibraryGroup: LibraryGroup) => void;
  /** Immediate commit of whatever is on screen, for blur and Enter. */
  commitNow: () => void;
  setMatchCase: (ruleId: string, matchCase: boolean) => void;
};

/**
 * Owns the query-builder tree while the user is editing it.
 *
 * The library tree is local state, not a value derived from props on every
 * render, so a keystroke does not rebuild the tree, remount the row, and drop
 * focus. When a commit happens is `useDebouncedFilterCommit`'s job; what this
 * hook adds is the local tree, the per-rule match-case map, and adopting a tree
 * the form replaced from outside.
 *
 * Every callback it returns is stable, because they all reach the current tree
 * through a ref. `QueryBuilder` fans these out to every control through its
 * `context` prop, so a new identity per keystroke would re-render the whole
 * tree on each character.
 */
export function useFilterTreeState({
  value,
  columnTypes,
  onChange,
}: Options): FilterTreeState {
  const [query, setQuery] = useState<LibraryGroup>(() => {
    return makeLibraryFilterGroupFromQueryFilterGroup(value);
  });
  const [matchCaseById, setMatchCaseById] = useState<Record<string, boolean>>(
    () => {
      return getMatchCaseByIdFromFilterGroup(value);
    },
  );

  const {
    commitNow,
    commitSoon,
    cancelPendingCommit,
    getLastCommitted,
    setLastCommitted,
  } = useDebouncedFilterCommit({ columnTypes, onChange, initialValue: value });

  // The last `value` prop we acted on, serialized. Adoption keys off this
  // rather than off the last committed tree alone: a host that does not echo
  // our commit back (a controlled parent that ignores the change, or a test
  // spy) would otherwise look like an external replacement on every render and
  // wipe local state.
  //
  // Left empty on the first render on purpose: the initial tree is already
  // built from `value` by `useState` above, so there is nothing to adopt until
  // the prop actually changes, and serializing eagerly here would rebuild a
  // string on every render only to throw it away.
  const lastSeenValueRef = useRef<string | undefined>(undefined);

  // Latest tree and match-case map, so every returned callback can stay stable.
  const queryRef = useRef(query);
  const matchCaseRef = useRef(matchCaseById);
  useEffect(function trackLatestTree() {
    queryRef.current = query;
    matchCaseRef.current = matchCaseById;
  });

  // Adopt externally replaced trees (Reset, Open, SQL-to-form mapping) while
  // ignoring the parent echoing back the tree we just committed.
  useEffect(
    function adoptExternalValue() {
      const serialized = JSON.stringify(value);
      if (serialized === lastSeenValueRef.current) {
        return;
      }
      lastSeenValueRef.current = serialized;
      if (serialized === JSON.stringify(getLastCommitted())) {
        return;
      }
      // A replacement can land asynchronously (a chat answer, a URL sync) while
      // the user is still typing, so a commit for the tree being replaced may
      // already be scheduled. Letting it fire would re-commit the abandoned
      // tree over the new one and leave the panel and the SQL disagreeing.
      cancelPendingCommit();
      setLastCommitted(value);
      setQuery(makeLibraryFilterGroupFromQueryFilterGroup(value));
      setMatchCaseById(getMatchCaseByIdFromFilterGroup(value));
    },
    [cancelPendingCommit, getLastCommitted, setLastCommitted, value],
  );

  const commitTree = useCallback(
    (nextLibraryGroup: LibraryGroup) => {
      const normalized = normalizeLibraryTree({
        group: nextLibraryGroup,
        columnTypes,
      });
      setQuery(normalized);
      commitNow(normalized, matchCaseRef.current);
    },
    [columnTypes, commitNow],
  );

  const onQueryChange = useCallback(
    (nextLibraryGroup: LibraryGroup) => {
      // Only a typed value should wait for the debounce. Adding or removing a
      // rule, switching a column, an operator, or a combinator is a deliberate
      // act that should take effect at once.
      if (
        _structureSignature(nextLibraryGroup) !==
        _structureSignature(queryRef.current)
      ) {
        commitTree(nextLibraryGroup);
        return;
      }
      const normalized = normalizeLibraryTree({
        group: nextLibraryGroup,
        columnTypes,
      });
      setQuery(normalized);
      commitSoon(normalized, matchCaseRef.current);
    },
    [columnTypes, commitSoon, commitTree],
  );

  const setMatchCase = useCallback(
    (ruleId: string, matchCase: boolean) => {
      const nextMatchCase = { ...matchCaseRef.current, [ruleId]: matchCase };
      setMatchCaseById(nextMatchCase);
      commitNow(queryRef.current, nextMatchCase);
    },
    [commitNow],
  );

  const commitOnScreenTree = useCallback(() => {
    commitNow(queryRef.current, matchCaseRef.current);
  }, [commitNow]);

  return {
    query,
    matchCaseById,
    onQueryChange,
    commitNow: commitOnScreenTree,
    setMatchCase,
  };
}
