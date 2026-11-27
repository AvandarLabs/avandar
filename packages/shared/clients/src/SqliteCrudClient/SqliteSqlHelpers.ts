import {
  assertIsDefined,
  objectEntries,
  objectKeys,
  objectValuesMap,
} from "@avandar/utils";
import { match } from "ts-pattern";
import type { FilterOperator, FiltersByColumn } from "@avandar/utils";

/**
 * Quote an identifier (table or column name) with double quotes so
 * reserved words and snake_case names round-trip correctly. Embedded
 * double quotes are doubled per SQL grammar; nothing in the codebase
 * uses identifiers containing them today, but quoting keeps the path
 * safe if a future migration introduces one.
 */
export function buildQuotedSqlIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/** Column names an `orderBy` entry may reference. */
const ORDER_COLUMN = /^[a-z_][a-z0-9_]*$/;

/**
 * Build an ` order by` clause from the caller's `orderBy`. Returns an empty
 * string when no ordering was requested, so unordered pages are unchanged.
 * Throws if a column name falls outside `ORDER_COLUMN`.
 */
export function buildOrderByClauseFromColumns(
  orderBy:
    | ReadonlyArray<{ column: string; direction: "asc" | "desc" }>
    | undefined,
): string {
  if (!orderBy || orderBy.length === 0) {
    return "";
  }
  const parts = orderBy.map((order) => {
    if (!ORDER_COLUMN.test(order.column)) {
      throw new Error(`Unsupported order column: ${order.column}`);
    }
    return `${buildQuotedSqlIdentifier(order.column)} ${order.direction}`;
  });
  return ` order by ${parts.join(", ")}`;
}

/**
 * Build a parameterised WHERE clause from the model's
 * `FiltersByColumn` shape. Supports the same operators as the
 * Supabase client (`eq`, `in`, `is`) and emits placeholders rather than
 * interpolating values; the only thing that gets concatenated is the
 * caller-controlled column name.
 */
export function buildWhereClauseFromFilters<
  DBRead extends Record<string, unknown>,
>(
  filters: FiltersByColumn<DBRead> | undefined,
): { where: string; params: unknown[] } {
  if (!filters) {
    return { where: "", params: [] };
  }
  const clauses: string[] = [];
  const params: unknown[] = [];

  objectKeys(filters).forEach((column) => {
    const filter = filters[column];
    if (!filter) {
      return;
    }
    objectEntries(filter).forEach(([operator, value]) => {
      const quotedColumn = buildQuotedSqlIdentifier(String(column));
      match(operator as FilterOperator)
        .with("eq", () => {
          clauses.push(`${quotedColumn} = ?`);
          params.push(value as unknown);
        })
        .with("in", () => {
          const values = (value as readonly unknown[]) ?? [];
          if (values.length === 0) {
            // An empty IN list in SQL is invalid; degrade to a
            // contradiction so the surrounding query returns no rows.
            clauses.push("1 = 0");
            return;
          }
          const placeholders = values
            .map(() => {
              return "?";
            })
            .join(", ");
          clauses.push(`${quotedColumn} in (${placeholders})`);
          params.push(...values);
        })
        .with("is", () => {
          clauses.push(`${quotedColumn} is null`);
        })
        .exhaustive();
    });
  });

  return clauses.length === 0
    ? { where: "", params: [] }
    : { where: ` where ${clauses.join(" and ")}`, params };
}

/**
 * Stringify object/array values so bun:sqlite can store them in
 * TEXT-affinity (`jsonb`) columns. Returns primitives unchanged.
 * Symmetric parse-on-read is intentionally not done here; model
 * parsers handle DBRead → ModelRead transforms and can pick up the
 * raw JSON strings.
 */
export function serializeRowValues(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return objectValuesMap(row, (value) => {
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      return JSON.stringify(value);
    }
    return value;
  });
}

type BuildInsertSqlArgs = {
  table: string;
  cols: readonly string[];
  pk: string;
  valuesClause?: string;
  upsert: boolean;
  onConflict: { columnNames: string[]; ignoreDuplicates: boolean } | undefined;
};

/**
 * Compose an `insert ... values ... [on conflict ...] returning *`
 * statement. `valuesClause` is provided for the bulk path; the single
 * insert path leaves it undefined and uses one `(?, ?, …)` row.
 */
export function buildInsertSqlFromRows(
  args: Readonly<BuildInsertSqlArgs>,
): string {
  const { table, cols, pk, valuesClause, upsert, onConflict } = args;
  const colsClause = cols.map(buildQuotedSqlIdentifier).join(", ");
  const values =
    valuesClause ??
    "(" +
      cols
        .map(() => {
          return "?";
        })
        .join(", ") +
      ")";
  let conflict = "";
  if (upsert) {
    assertIsDefined(onConflict, "`onConflict` must be defined when upserting");
    const onCols = onConflict.columnNames
      .map(buildQuotedSqlIdentifier)
      .join(", ");
    if (onConflict.ignoreDuplicates) {
      conflict = ` on conflict (${onCols}) do nothing`;
    } else {
      const updates = cols
        .filter((col) => {
          return col !== pk && !onConflict.columnNames.includes(col);
        })
        .map((col) => {
          return `${buildQuotedSqlIdentifier(col)} = excluded.${buildQuotedSqlIdentifier(col)}`;
        })
        .join(", ");
      conflict =
        updates.length === 0
          ? ` on conflict (${onCols}) do nothing`
          : ` on conflict (${onCols}) do update set ${updates}`;
    }
  }
  return `insert into ${table} (${colsClause}) values ${values}${conflict} returning *`;
}
