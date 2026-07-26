import { uuid } from "$/lib/uuid.ts";
import { Parser } from "node-sql-parser";
import { _columnRefName } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type { DatasetWithColumns } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.types.ts";
import type { QueryFilterCombinator } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  NestedSubquerySource,
  QueryJoin,
  QueryJoinKind,
  QueryJoinOnEquality,
} from "$/models/queries/StructuredQuery/QueryJoin.types.ts";

export type FromResolution = {
  base?: DatasetWithColumns;
  baseAlias?: string;
  nestedSubquery?: NestedSubquerySource;
  joins: QueryJoin[];
};

/**
 * Resolve a single FROM-list entry to a dataset reference (if we know it),
 * a nested subquery, or `undefined` when we can't classify it.
 */
function _resolveDataset(
  tableName: string,
  datasets: readonly DatasetWithColumns[],
): DatasetWithColumns | undefined {
  return datasets.find((d) => {
    return (
      d.dataset.id === tableName ||
      d.dataset.name === tableName ||
      d.dataset.name.toLowerCase() === tableName.toLowerCase()
    );
  });
}

function _joinKindFromKeyword(keyword: string): QueryJoinKind {
  const lower = keyword.toLowerCase();
  if (lower.includes("left")) {
    return "left";
  }
  if (lower.includes("right")) {
    return "right";
  }
  if (lower.includes("full")) {
    return "full";
  }
  if (lower.includes("cross")) {
    return "cross";
  }
  return "inner";
}

function _parseJoinOn(
  onNode: unknown,
  unmappedReasons: string[],
):
  | { predicates: QueryJoinOnEquality[]; combinator: QueryFilterCombinator }
  | undefined {
  if (onNode === null || typeof onNode !== "object") {
    return undefined;
  }
  const obj = onNode as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    return undefined;
  }
  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = _parseJoinOn(obj.left, unmappedReasons);
    const right = _parseJoinOn(obj.right, unmappedReasons);
    if (!left || !right) {
      return undefined;
    }
    return {
      predicates: [...left.predicates, ...right.predicates],
      combinator: operator,
    };
  }
  if (operator !== "=") {
    unmappedReasons.push(
      `JOIN ON clause uses "${operator}": only equality joins are mapped.`,
    );
    return undefined;
  }
  const leftCol = _columnRefName(obj.left);
  const rightCol = _columnRefName(obj.right);
  const leftTable = (obj.left as { table?: string | null } | null)?.table;
  const rightTable = (obj.right as { table?: string | null } | null)?.table;
  if (!leftCol || !rightCol) {
    unmappedReasons.push(
      "JOIN ON clause uses a non-column reference; the form will keep it via raw SQL.",
    );
    return undefined;
  }
  return {
    predicates: [
      {
        type: "equality",
        leftColumn: leftCol,
        rightColumn: rightCol,
        ...(leftTable ? { leftTable } : {}),
        ...(rightTable ? { rightTable } : {}),
      },
    ],
    combinator: "AND",
  };
}

function _stringifyNodeSqlParserSelect(node: unknown): string {
  // We embed the original SQL as-is when available. If not, fall back to
  // node-sql-parser's `sqlify`. This is best-effort; if it fails we return
  // an empty string and the caller surfaces a warning.
  try {
    const parser = new Parser();
    return parser.sqlify(node as Parameters<Parser["sqlify"]>[0]);
  } catch {
    return "";
  }
}

/**
 * Walk the FROM list and produce a FromResolution: pick a base dataset
 * (either a known table or a nested subquery), collect any JOINs, and
 * record unmapped reasons.
 */
export function _resolveFrom(
  fromList: unknown,
  datasets: readonly DatasetWithColumns[],
  unmappedReasons: string[],
): FromResolution | undefined {
  if (!Array.isArray(fromList) || fromList.length === 0) {
    unmappedReasons.push("Could not determine a base table from FROM clause.");
    return undefined;
  }

  let base: DatasetWithColumns | undefined;
  let baseAlias: string | undefined;
  let nestedSubquery: NestedSubquerySource | undefined;
  const joins: QueryJoin[] = [];

  fromList.forEach((rawItem, idx) => {
    const item = rawItem as Record<string, unknown>;
    const joinKeyword =
      typeof item.join === "string" && item.join.length > 0 ?
        (item.join as string)
      : undefined;
    const tableName = typeof item.table === "string" ? item.table : undefined;
    const alias = typeof item.as === "string" ? item.as : undefined;
    const subqueryExpr =
      (
        item.expr &&
        typeof item.expr === "object" &&
        "ast" in (item.expr as Record<string, unknown>)
      ) ?
        (item.expr as { ast: unknown }).ast
      : undefined;

    if (idx === 0) {
      // Base table
      if (subqueryExpr) {
        const sql = _stringifyNodeSqlParserSelect(subqueryExpr);
        nestedSubquery = {
          type: "subquery",
          id: uuid(),
          sql,
          alias: alias ?? "subq",
        };
        if (!sql) {
          nestedSubquery.parseFailed = true;
          unmappedReasons.push(
            "Nested subquery in FROM could not be re-serialised; mapping kept as a placeholder.",
          );
        }
      } else if (tableName) {
        base = _resolveDataset(tableName, datasets);
        baseAlias = alias;
        if (!base) {
          unmappedReasons.push(
            `Could not find a known dataset matching "${tableName}".`,
          );
        }
      } else {
        unmappedReasons.push("FROM clause is not a plain table reference.");
      }
      return;
    }

    // Subsequent entries: either a JOIN or a comma-separated cross product
    if (!joinKeyword) {
      unmappedReasons.push(
        "Comma-joined tables are not mapped; treat them as INNER JOIN with ON true.",
      );
      return;
    }

    const onParsed = _parseJoinOn(item.on, unmappedReasons);
    const kind = _joinKindFromKeyword(joinKeyword);
    if (subqueryExpr) {
      const sql = _stringifyNodeSqlParserSelect(subqueryExpr);
      const subAlias = alias ?? `j${idx}`;
      joins.push({
        id: uuid(),
        kind,
        target: {
          type: "subquery",
          subqueryId: sql || `/* unmapped subquery ${idx} */`,
          alias: subAlias,
        },
        on: onParsed ? onParsed.predicates : [],
        combinator: onParsed?.combinator ?? "AND",
      });
      if (!sql) {
        unmappedReasons.push(
          `JOIN subquery at position ${idx} could not be re-serialised.`,
        );
      }
      return;
    }
    if (!tableName) {
      unmappedReasons.push(
        `JOIN entry at position ${idx} is not a plain table reference.`,
      );
      return;
    }
    joins.push({
      id: uuid(),
      kind,
      target: { type: "table", tableName, ...(alias ? { alias } : {}) },
      on: onParsed ? onParsed.predicates : [],
      combinator: onParsed?.combinator ?? "AND",
    });
  });

  if (!base && !nestedSubquery) {
    return undefined;
  }
  return { base, baseAlias, nestedSubquery, joins };
}

