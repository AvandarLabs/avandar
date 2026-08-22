import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { RenderFilterRuleOptions } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.ts";
import type { Knex } from "knex";

import { renderFilterGroup } from "$/models/queries/StructuredQuery/renderFilterGroup/renderFilterGroup.ts";

/**
 * Applies a filter tree as the query's HAVING clause, rendered after GROUP BY.
 *
 * Shares `renderFilterGroup` with `applyFilters`: one implementation of every
 * operator means HAVING can never fall behind WHERE.
 */
export function applyHaving(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
  options: RenderFilterRuleOptions = {},
): Knex.QueryBuilder {
  const fragment = renderFilterGroup(group, options);
  if (!fragment) {
    return builder;
  }
  return builder.havingRaw(fragment.sql, fragment.bindings);
}
