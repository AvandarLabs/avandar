import {
  isFilterRuleComplete,
  validateFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

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
      if (!isFilterRuleComplete(child)) {
        return { ...counts, unfinished: counts.unfinished + 1 };
      }
      if (validateFilterRule(child) !== undefined) {
        return { ...counts, invalid: counts.invalid + 1 };
      }
      return { ...counts, applied: counts.applied + 1 };
    },
    { applied: 0, unfinished: 0, invalid: 0 },
  );
}
