import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collectMatchCaseById,
  normalizeLibraryTree,
  toInternalFilterGroup,
  toLibraryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";

/** Milliseconds of quiet before a typed value is committed upward. */
const COMMIT_DEBOUNCE_MS = 300;

/**
 * Everything about a tree except the values typed into it. Two trees with the
 * same signature differ only in what the user is typing, which is the one case
 * worth debouncing.
 */
function structureSignature(group: LibraryGroup): string {
  const parts = group.rules.map((child) => {
    if ("rules" in child && "combinator" in child) {
      return structureSignature(child);
    }
    return `${child.id ?? ""}:${child.field}:${child.operator}`;
  });
  return `${group.id ?? ""}:${group.combinator}(${parts.join(",")})`;
}

type Options = {
  /** The committed filter tree owned by the form. */
  value: QueryFilterGroup;
  /** Live column types, used to stamp each rule's data type on commit. */
  columnTypes: Readonly<Record<string, AvaDataType.T>>;
  onChange: (next: QueryFilterGroup) => void;
};

type FilterTreeState = {
  /** The tree the query builder renders. Owned locally while editing. */
  query: LibraryGroup;
  /** Per-rule `Match case` state, keyed by rule id. */
  matchCaseById: Readonly<Record<string, boolean>>;
  /** Debounced commit, for value typing. */
  onQueryChange: (next: LibraryGroup) => void;
  /** Immediate commit, for structural edits, blur, and Enter. */
  commitNow: (next: LibraryGroup) => void;
  setMatchCase: (ruleId: string, matchCase: boolean) => void;
};

/**
 * Owns the query-builder tree while the user is editing it.
 *
 * The library tree is local state, not a value derived from props on every
 * render, so a keystroke does not rebuild the tree, remount the row, and drop
 * focus. Commits upward are debounced while typing and immediate for
 * structural edits, which is also what stops a query running for a rule the
 * user has not finished writing.
 */
export function useFilterTreeState({
  value,
  columnTypes,
  onChange,
}: Options): FilterTreeState {
  const [query, setQuery] = useState<LibraryGroup>(() => {
    return toLibraryFilterGroup(value);
  });
  const [matchCaseById, setMatchCaseById] = useState<Record<string, boolean>>(
    () => {
      return collectMatchCaseById(value);
    },
  );

  /** The last tree we sent upward, so the echo of our own commit is ignored. */
  const committedRef = useRef<QueryFilterGroup>(value);
  /**
   * The last `value` prop we acted on. Adoption keys off this rather than off
   * `committedRef` alone: a host that does not echo our commit back (a
   * controlled parent that ignores the change, or a test spy) would otherwise
   * look like an external replacement on every render and wipe local state.
   */
  const lastSeenValueRef = useRef<string>(JSON.stringify(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Adopt externally replaced trees (Reset, Open, SQL-to-form mapping) while
  // ignoring the parent echoing back the tree we just committed.
  useEffect(
    function adoptExternalValue() {
      const serialized = JSON.stringify(value);
      if (serialized === lastSeenValueRef.current) {
        return;
      }
      lastSeenValueRef.current = serialized;
      if (serialized === JSON.stringify(committedRef.current)) {
        return;
      }
      committedRef.current = value;
      setQuery(toLibraryFilterGroup(value));
      setMatchCaseById(collectMatchCaseById(value));
    },
    [value],
  );

  useEffect(function clearTimerOnUnmount() {
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commit = useCallback(
    (next: LibraryGroup, matchCase: Readonly<Record<string, boolean>>) => {
      const internal = toInternalFilterGroup(next, {
        columnTypes,
        matchCaseById: matchCase,
      });
      committedRef.current = internal;
      onChange(internal);
    },
    [columnTypes, onChange],
  );

  const commitNow = useCallback(
    (next: LibraryGroup) => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      const normalized = normalizeLibraryTree(next, columnTypes);
      setQuery(normalized);
      commit(normalized, matchCaseById);
    },
    [columnTypes, commit, matchCaseById],
  );

  const onQueryChange = useCallback(
    (next: LibraryGroup) => {
      // Only a typed value should wait for the debounce. Adding or removing a
      // rule, switching a column, an operator, or a combinator is a deliberate
      // act that should take effect at once.
      if (structureSignature(next) !== structureSignature(query)) {
        commitNow(next);
        return;
      }
      const normalized = normalizeLibraryTree(next, columnTypes);
      setQuery(normalized);
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        commit(normalized, matchCaseById);
      }, COMMIT_DEBOUNCE_MS);
    },
    [columnTypes, commit, commitNow, matchCaseById, query],
  );

  const setMatchCase = useCallback(
    (ruleId: string, matchCase: boolean) => {
      const nextMatchCase = { ...matchCaseById, [ruleId]: matchCase };
      setMatchCaseById(nextMatchCase);
      commit(query, nextMatchCase);
    },
    [commit, matchCaseById, query],
  );

  return useMemo(() => {
    return {
      query,
      matchCaseById,
      onQueryChange,
      commitNow,
      setMatchCase,
    };
  }, [query, matchCaseById, onQueryChange, commitNow, setMatchCase]);
}
