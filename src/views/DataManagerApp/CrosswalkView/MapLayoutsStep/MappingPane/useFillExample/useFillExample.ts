import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { validateCombineExpression } from "@/lib/crosswalks/validateCombineExpression/validateCombineExpression";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";

/** How many example rows the pane shows. */
const EXAMPLE_ROW_COUNT = 3;

/** One example: a value in the dataset and what the combined dataset holds. */
export type FillExampleRow = {
  before: string;
  /** Undefined when the combined dataset holds nothing for the value. */
  after: string | undefined;
};

/** Everything an example reads: what `toFillSql` takes, and where to read. */
export type FillExampleOptions = CrosswalkSql.CodeLists & {
  workspaceId: Workspace.Id;
  /** The layout's first dataset. */
  datasetId: Dataset.Id;
  fill: CrosswalkMapping.Fill | undefined;
  /** The combined dataset's column being filled. A draft column fits. */
  column: CrosswalkSql.Column;
  codesOutputAs: Crosswalk.CodesOutput;
  /** The layout's columns, which a Combine formula may name. */
  columnNames: readonly string[];
};

function _toBeforeSql(fill: CrosswalkMapping.Fill): string | undefined {
  if (fill.kind === "column") {
    return `CAST(${quoteSqlIdentifier(fill.sourceColumn)} AS VARCHAR)`;
  }
  if (fill.kind !== "expression") {
    return undefined;
  }
  const parts = CrosswalkMapping.getCombineColumnNames(fill.sql).map((name) => {
    return `CAST(${quoteSqlIdentifier(name)} AS VARCHAR)`;
  });
  return parts.length === 0
    ? undefined
    : `concat_ws(', ', ${parts.join(", ")})`;
}

/**
 * The example's query: up to three different values of the fill's source
 * (a column, or a Combine formula's columns joined), each beside exactly
 * the SQL the combined dataset fills the column with, as text. Undefined
 * for a fill with nothing to show: a fixed value, an empty fill, or a
 * Combine formula that is not valid yet.
 */
export function buildFillExampleSql(
  options: Readonly<Omit<FillExampleOptions, "workspaceId">>,
): string | undefined {
  const { fill } = options;
  if (!fill) {
    return undefined;
  }
  if (
    fill.kind === "expression" &&
    !validateCombineExpression({
      sql: fill.sql,
      columnNames: options.columnNames,
    }).isValid
  ) {
    return undefined;
  }
  const beforeSql = _toBeforeSql(fill);
  if (beforeSql === undefined) {
    return undefined;
  }
  const afterSql = CrosswalkSql.toFillSql({
    fill,
    column: options.column,
    codesOutputAs: options.codesOutputAs,
    codeListsById: options.codeListsById,
    primaryCodeListIdByEntryId: options.primaryCodeListIdByEntryId,
  });
  const relation = quoteSqlIdentifier(options.datasetId);
  return (
    `SELECT DISTINCT ${beforeSql} AS "before", CAST(${afterSql} AS VARCHAR) AS "after" ` +
    `FROM ${relation} WHERE ${beforeSql} IS NOT NULL AND ${beforeSql} <> '' LIMIT ${EXAMPLE_ROW_COUNT}`
  );
}

function _toExampleRow(row: Readonly<Record<string, unknown>>): FillExampleRow {
  const { before, after } = row;
  return {
    before: before === null || before === undefined ? "" : String(before),
    after: after === null || after === undefined ? undefined : String(after),
  };
}

/**
 * Reads a fill's before and after example on this device, once per query,
 * dropping a reply that arrives after the fill changed. Undefined when the
 * fill has no example.
 */
export function useFillExample(
  options: Readonly<FillExampleOptions>,
): TaggedRead<FillExampleRow[]> | undefined {
  const sql = buildFillExampleSql(options);
  const read = useTaggedRead({
    key: sql,
    devMsg: "Reading a crosswalk fill example failed",
    read: async () => {
      const result = await WorkspaceQuerySession.runQuery<
        Record<string, unknown>
      >({
        workspaceId: options.workspaceId,
        rawSql: sql ?? "",
      });
      return result.data.map(_toExampleRow);
    },
  });
  return sql === undefined ? undefined : read;
}
