import { prop, propEq } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/** Chooses default visualization axes and series from result identities. */
export const VizHydrationColumns = {
  /** Returns the available result identities for membership checks. */
  getIdSet: (
    columns: readonly QueryResult.BoundColumn[],
  ): Set<QueryColumn.Id> => {
    return new Set(columns.map(prop("id")));
  },

  /** Returns the first numeric identity, when one is available. */
  getFirstNumericColumnId: (
    columns: readonly QueryResult.BoundColumn[],
  ): QueryColumn.Id | undefined => {
    return columns.find((column) => {
      return AvaDataType.isNumeric(column.dataType);
    })?.id;
  },

  /** Prefers temporal, text, boolean, then numeric unused category columns. */
  getCategoryColumnId: ({
    columns,
    excludedIds,
  }: Readonly<{
    columns: readonly QueryResult.BoundColumn[];
    excludedIds: ReadonlySet<QueryColumn.Id>;
  }>): QueryColumn.Id | undefined => {
    const available = columns.filter((column) => {
      return !excludedIds.has(column.id);
    });
    return (
      available.find((column) => {
        return AvaDataType.isTemporal(column.dataType);
      })?.id ??
      available.find((column) => {
        return AvaDataType.isText(column.dataType);
      })?.id ??
      available.find(propEq("dataType", "boolean"))?.id ??
      available.find((column) => {
        return AvaDataType.isNumeric(column.dataType);
      })?.id ??
      available[0]?.id
    );
  },
};
