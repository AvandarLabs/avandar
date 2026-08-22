import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

import { QueryFilterValidation } from "$/models/queries/StructuredQuery/QueryFilterValidation/QueryFilterValidation.ts";

/** Counts of applied, unfinished, and invalid rules in a filter tree. */
export type FilterRuleCounts = {
  /** Rules that reach the query. */
  applied: number;
  /** Rules the user has not finished writing. */
  unfinished: number;
  /** Complete rules that cannot be applied, such as a letter in a number. */
  invalid: number;
};

/**
 * Counts what the query actually uses, so the panel and the results area can
 * both say "3 filters applied, 1 not applied" from the same source.
 */
export function countFilterRules(group: QueryFilterGroup): FilterRuleCounts {
  return group.rules.reduce<FilterRuleCounts>(
    (counts, child) => {
      if (child.type === "group") {
        const nested = countFilterRules(child);
        return {
          applied: counts.applied + nested.applied,
          unfinished: counts.unfinished + nested.unfinished,
          invalid: counts.invalid + nested.invalid,
        };
      }
      if (!QueryFilterValidation.isRuleComplete(child)) {
        return { ...counts, unfinished: counts.unfinished + 1 };
      }
      if (QueryFilterValidation.validateRule(child) !== undefined) {
        return { ...counts, invalid: counts.invalid + 1 };
      }
      return { ...counts, applied: counts.applied + 1 };
    },
    { applied: 0, unfinished: 0, invalid: 0 },
  );
}
