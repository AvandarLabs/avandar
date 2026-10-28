import { propEq } from "@avandar/utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/**
 * Gets the query column ID of the one `QueryResult` column with this name,
 * matching exactly first and then case-insensitively. Undefined when none or
 * several match.
 *
 * A `QueryResult` column name is the name the query emits, which is not
 * always the name of the source column it reads. An aggregate is emitted as
 * `sum(revenue)` rather than `revenue`, and an explicit alias replaces the
 * name entirely.
 */
export function getQueryColumnIdFromQueryResultColumnName({
  name,
  columns,
}: Readonly<{
  name: string;
  columns: readonly QueryResult.ColumnWithId[];
}>): QueryColumn.Id | undefined {
  const exact = columns.filter(propEq("name", name));
  if (exact.length > 0) {
    return exact.length === 1 ? exact[0]!.id : undefined;
  }
  const folded = columns.filter((column) => {
    return column.name.toLowerCase() === name.toLowerCase();
  });
  return folded.length === 1 ? folded[0]!.id : undefined;
}
