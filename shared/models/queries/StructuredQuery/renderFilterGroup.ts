import { renderFilterRule } from "$/models/queries/StructuredQuery/renderFilterRule.ts";
import type {
  QueryFilter,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  RenderFilterRuleOptions,
  SqlFragment,
} from "$/models/queries/StructuredQuery/renderFilterRule.ts";

function _renderNode(
  node: QueryFilter,
  options: RenderFilterRuleOptions,
): SqlFragment | undefined {
  if (node.type === "rule") {
    return renderFilterRule(node, options);
  }
  const nested = renderFilterGroup(node, options);
  return nested ?
      { sql: `(${nested.sql})`, bindings: nested.bindings }
    : undefined;
}

/**
 * Renders a filter tree to one SQL fragment. Returns `undefined` when nothing
 * in the tree is renderable, so callers can leave the clause off entirely.
 *
 * Rules that are incomplete are skipped rather than rendered, which is what
 * keeps a half-typed rule from turning into `col = ''`. The UI reports skipped
 * rules through `isFilterRuleComplete`, so the exclusion is never silent.
 */
export function renderFilterGroup(
  group: QueryFilterGroup,
  options: RenderFilterRuleOptions = {},
): SqlFragment | undefined {
  const fragments = group.rules
    .map((node) => {
      return _renderNode(node, options);
    })
    .filter((fragment): fragment is SqlFragment => {
      return fragment !== undefined;
    });

  if (fragments.length === 0) {
    return undefined;
  }

  const joiner = group.combinator === "OR" ? " or " : " and ";
  return {
    sql: fragments
      .map((fragment) => {
        return fragment.sql;
      })
      .join(joiner),
    bindings: fragments.flatMap((fragment) => {
      return [...fragment.bindings];
    }),
  };
}
