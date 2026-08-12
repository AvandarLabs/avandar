import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { match } from "ts-pattern";
import type {
  QueryJoin,
  QueryJoinOnEquality,
} from "$/models/queries/StructuredQuery/QueryJoin.types.ts";
import type { Knex } from "knex";

/**
 * Apply each join in order to the knex query builder. Subquery joins use
 * `knex.raw` so we don't need to recursively build a knex sub-builder.
 */
export function applyJoins(
  builder: Knex.QueryBuilder,
  joins: readonly QueryJoin[],
): Knex.QueryBuilder {
  return joins.reduce<Knex.QueryBuilder>((current, join) => {
    const onClause = _buildJoinOnClause(join.on, join.combinator ?? "AND");
    const joinTarget = _buildJoinTargetSql(join);
    // All join kinds are rendered through `joinRaw`. `cross` omits the ON
    // clause; every other kind keeps it.
    const joinSQL = match(join.kind)
      .with("inner", () => {
        return `inner join ${joinTarget} on ${onClause}`;
      })
      .with("left", () => {
        return `left join ${joinTarget} on ${onClause}`;
      })
      .with("right", () => {
        return `right join ${joinTarget} on ${onClause}`;
      })
      .with("full", () => {
        return `full outer join ${joinTarget} on ${onClause}`;
      })
      .with("cross", () => {
        return `cross join ${joinTarget}`;
      })
      .exhaustive(() => {
        throw new Error(`Unknown join kind: ${String(join.kind)}`);
      });
    return current.joinRaw(joinSQL);
  }, builder);
}

function _buildJoinTargetSql(join: QueryJoin): string {
  if (join.target.type === "subquery") {
    const alias = quoteSqlIdentifier(join.target.alias);
    return `(${join.target.subqueryId}) as ${alias}`;
  }
  const table = quoteSqlIdentifier(join.target.tableName);
  if (join.target.alias) {
    return `${table} as ${quoteSqlIdentifier(join.target.alias)}`;
  }
  return table;
}

function _buildJoinOnClause(
  predicates: readonly QueryJoinOnEquality[],
  combinator: "AND" | "OR",
): string {
  return predicates
    .map((p) => {
      const left =
        p.leftTable ?
          `${quoteSqlIdentifier(p.leftTable)}.` +
          `${quoteSqlIdentifier(p.leftColumn)}`
        : quoteSqlIdentifier(p.leftColumn);
      const right =
        p.rightTable ?
          `${quoteSqlIdentifier(p.rightTable)}.` +
          `${quoteSqlIdentifier(p.rightColumn)}`
        : quoteSqlIdentifier(p.rightColumn);
      return `${left} = ${right}`;
    })
    .join(` ${combinator} `);
}
