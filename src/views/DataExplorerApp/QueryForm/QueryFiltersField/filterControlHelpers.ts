import { isPlainObject } from "@avandar/utils";
import type { QueryFilterColumnTypes } from "$/models/queries/StructuredQuery/QueryFilter.types";

/**
 * Everything our controls need beyond what react-querybuilder gives them,
 * passed through `QueryBuilder`'s `context` prop.
 */
export type FilterControlsContext = {
  /** Column data types keyed by column name. */
  columnTypes: QueryFilterColumnTypes;
  /** Per-rule Match case state, keyed by rule id. */
  matchCaseById: Record<string, boolean>;
  /** Updates Match case for one rule. */
  setMatchCase: (ruleId: string, matchCase: boolean) => void;
  /** Flushes any pending debounced commit. */
  commitNow: () => void;
};

/**
 * Reads back the context `QueryFiltersField` passed to `QueryBuilder`.
 *
 * The assertion cannot be avoided: react-querybuilder types `context` as `any`
 * and offers no generic to carry our shape through, so there is nothing for the
 * compiler to check against. `QueryFiltersField` is the only producer, which is
 * what makes the assertion safe in practice.
 */
export function getFilterControlsContext(
  context: unknown,
): FilterControlsContext {
  return context as FilterControlsContext;
}

/**
 * The `name` of one react-querybuilder option, or an empty string when the
 * option is not a named object. The library's option lists can also hold option
 * *groups*, which carry no `name`, hence the guard rather than a field read.
 */
export function getOptionNameFromUnknown(option: unknown): string {
  return isPlainObject(option) && "name" in option ? String(option.name) : "";
}
