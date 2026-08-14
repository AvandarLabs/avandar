import { Model } from "@avandar/models";
import {
  makeObjectFromEntries,
  pickProps,
  prop,
  sortObjList,
} from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { uuid } from "$/lib/uuid";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { PublicQetlClient } from "@/clients/qetl/PublicQetlClient";
import { WorkspaceQetlClient } from "@/clients/qetl/WorkspaceQetlClient";
import { resolveManualQueryForExecution } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A structured query's columns, in the stable order execution expects. */
type SortedQueryColumns = ReadonlyArray<
  StructuredQuery.Partial["queryColumns"][number]
>;

/** Who is asking, which decides which QETL client answers. */
export type StructuredQueryAuth =
  | { auth: "workspace"; workspaceId: Workspace.Id }
  | { auth: "public"; publicAvaPageId: Dashboard.Id };

/**
 * Inputs to {@link runStructuredQuery}: the query to execute, optional
 * caller-supplied raw SQL, and who is asking (which decides which QETL client
 * answers and whether a structured query is even permitted).
 */
export type RunStructuredQueryParams = StructuredQueryAuth & {
  query: StructuredQuery.Partial;
  rawSql: string | undefined;

  /**
   * When true, `rawSql` came from the manual form and the row-count guard may
   * replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;
};

/**
 * Resolves the SQL that should actually run: caller-supplied raw SQL takes
 * precedence, otherwise the structured query is resolved (with the
 * large-dataset auto-limit guard applied for workspace callers) and compiled.
 */
async function _selectSqlForExecution(
  params: RunStructuredQueryParams,
): Promise<{
  sqlToRun: string | undefined;
  executionQuery: StructuredQuery.Partial;
}> {
  const { query, rawSql, isStructuredQueryInSync = true } = params;

  const resolved =
    rawSql === undefined && params.auth === "workspace" ?
      await resolveManualQueryForExecution({
        query,
        workspaceId: params.workspaceId,
      })
    : { query, didAutoLimit: false as const };

  const sqlToRun = selectSqlToExecute({
    rawSql,
    isStructuredQueryInSync,
    executionQuery: resolved.query,
  });

  return { sqlToRun, executionQuery: resolved.query };
}

/** Runs already-compiled SQL against the client that matches the auth mode. */
async function _runRawSql(
  params: RunStructuredQueryParams,
  sqlToRun: string,
): Promise<QueryResult.T<UnknownRow>> {
  return params.auth === "public" ?
      await PublicQetlClient.runQuery({
        rawSql: sqlToRun,
        dashboardId: params.publicAvaPageId,
      })
    : await WorkspaceQetlClient.runQuery({
        rawSql: sqlToRun,
        workspaceId: params.workspaceId,
      });
}

/** Runs a structured query against its data source. */
async function _runSourceQuery({
  workspaceId,
  dataSource,
  executionQuery,
  sortedQueryColumns,
}: {
  workspaceId: Workspace.Id;
  dataSource: QueryDataSource.T | undefined;
  executionQuery: StructuredQuery.Partial;
  sortedQueryColumns: SortedQueryColumns;
}): Promise<QueryResult.T<UnknownRow>> {
  if (!dataSource || sortedQueryColumns.length === 0) {
    return QueryResult.makeEmpty();
  }

  const executionQueryWithSource = {
    ...executionQuery,
    dataSource,
  } as StructuredQuery.T;

  return await Model.match(dataSource, {
    Dataset: async (): Promise<QueryResult.T<UnknownRow>> => {
      return await WorkspaceQetlClient.runQuery({
        rawSql: StructuredQuery.toRawDuckDbQuery(executionQueryWithSource),
        workspaceId,
      });
    },

    // Entity sources resolve through EntityFieldValueClient, which may in
    // turn query many datasets.
    EntityConfig: async (entityConfig): Promise<QueryResult.T<UnknownRow>> => {
      return await _runEntityConfigQuery({
        entityConfig,
        sortedQueryColumns,
        workspaceId,
      });
    },
  });
}

/**
 * Runs an entity-source query.
 *
 * @returns The requested fields' values, keyed by field name.
 */
async function _runEntityConfigQuery({
  entityConfig,
  sortedQueryColumns,
  workspaceId,
}: {
  entityConfig: EntityConfig.T;
  sortedQueryColumns: SortedQueryColumns;
  workspaceId: Workspace.Id;
}): Promise<QueryResult.T<UnknownRow>> {
  // TODO(jpsyx): optimize this by using a progressive
  // table-materialization approach
  const fields = sortedQueryColumns
    .map(prop("baseColumn"))
    .filter(Model.valIsOfModelType("EntityFieldConfig"));

  // TODO(jpsyx): we still need to apply group bys, aggregations,
  // and sorting. Right now its just returning all values for the
  // requested fields.
  const rows = await EntityFieldValueClient.getAllEntityFieldValues({
    entityConfigId: entityConfig.id,
    entityFieldConfigs: fields,
    workspaceId,
  });

  return _buildEntityConfigResult(fields, rows);
}

/**
 * Builds a {@link QueryResult} out of the raw rows `EntityFieldValueClient`
 * returns, remapping each row from field ids to the field names the rest of
 * the query pipeline expects columns to be keyed by.
 */
function _buildEntityConfigResult(
  fields: readonly EntityFieldConfig.T[],
  rows: ReadonlyArray<Record<EntityFieldConfig.Id, unknown>>,
): QueryResult.T<UnknownRow> {
  const queryResultColumns: QueryResult.Column[] = fields.map(
    pickProps(["name", "dataType"]),
  );

  return {
    id: uuid<QueryResult.Id>(),
    // Mapping over `fields` rather than over the derived columns keeps each
    // field's id in hand, so no per-row lookup back into `fields` is needed.
    data: rows.map((row) => {
      return makeObjectFromEntries(
        fields.map((field) => {
          return [field.name, row[field.id]];
        }),
      );
    }),
    columns: queryResultColumns,
    numRows: rows.length,
  };
}

/**
 * Runs a structured query (or caller-supplied raw SQL) against the right QETL
 * client, resolving dataset and entity sources.
 *
 * This is the single execution path shared by the Data Explorer and the GIS
 * app. Callers wrap it in their own caching hook rather than duplicating the
 * source-resolution branches.
 */
export async function runStructuredQuery(
  params: RunStructuredQueryParams,
): Promise<QueryResult.T<UnknownRow>> {
  const { query } = params;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, { sortBy: prop("id") });

  const { sqlToRun, executionQuery } = await _selectSqlForExecution(params);

  if (sqlToRun) {
    return await _runRawSql(params, sqlToRun);
  }

  if (params.auth === "public") {
    // This message reaches the user through the Data Explorer's error banner
    // and the map's status overlay, so it is translated here rather than left
    // as an English literal.
    throw new Error(
      i18n._(
        msg`Public queries are not supported for structured queries. Use raw SQL instead.`,
      ),
    );
  }

  return await _runSourceQuery({
    workspaceId: params.workspaceId,
    dataSource,
    executionQuery,
    sortedQueryColumns,
  });
}
