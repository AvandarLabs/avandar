import { renderFilterGroup } from "$/models/queries/StructuredQuery/renderFilterGroup/renderFilterGroup.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { RenderFilterRuleOptions } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.ts";
import type { Knex } from "knex";

/**
 * Applies a filter tree as the query's WHERE clause.
 *
 * All operator semantics live in `renderFilterGroup` / `renderFilterRule` so
 * that WHERE and HAVING render identically; this function only decides where
 * the fragment is attached.
 */
export function applyFilters(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
  options: RenderFilterRuleOptions = {},
): Knex.QueryBuilder {
  const fragment = renderFilterGroup(group, options);
  if (!fragment) {
    return builder;
  }
  return builder.whereRaw(fragment.sql, fragment.bindings);
}
