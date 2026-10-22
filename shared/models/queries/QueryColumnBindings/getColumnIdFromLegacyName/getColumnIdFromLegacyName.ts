import { propEq } from "@avandar/utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/** Recovers a unique name-based target at legacy configuration ingress. */
export function getColumnIdFromLegacyName({
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
