import { Model } from "@avandar/models";
import { makeObjectFromEntries, prop, sortObjList } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { QueryResult as QueryResultFns } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { PublicQetlClient } from "@/clients/qetl/PublicQetlClient";
import { WorkspaceQetlClient } from "@/clients/qetl/WorkspaceQetlClient";
import { resolveManualQueryForExecution } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type {
  QueryResult,
  QueryResultColumn,
  QueryResultId,
} from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Who is asking, which decides which QETL client answers. */
export type StructuredQueryAuth =
  | { auth: "workspace"; workspaceId: Workspace.Id }
  | { auth: "public"; publicAvaPageId: DashboardId };

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
 * Runs a structured query (or caller-supplied raw SQL) against the right QETL
 * client, resolving dataset and entity sources.
 *
 * This is the single execution path shared by the Data Explorer and the GIS
 * app. Callers wrap it in their own caching hook rather than duplicating the
 * source-resolution branches.
 */
export async function runStructuredQuery(
  params: RunStructuredQueryParams,
): Promise<QueryResult<UnknownRow>> {
  const { query } = params;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, { sortBy: prop("id") });

  const { sqlToRun, executionQuery } = await _selectSqlForExecution(params);

  if (sqlToRun) {
    return await _runRawSql(params, sqlToRun);
  }

  if (params.auth === "public") {
    throw new Error(
      "Public queries are not supported for structured queries. " +
        "Use raw SQL instead.",
    );
  }

  return await _runSourceQuery(
    params.workspaceId,
    dataSource,
    executionQuery,
    sortedQueryColumns,
  );
}

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
): Promise<QueryResult<UnknownRow>> {
  if (params.auth === "public") {
    return await PublicQetlClient.runQuery({
      rawSql: sqlToRun,
      dashboardId: params.publicAvaPageId,
    });
  }
  return await WorkspaceQetlClient.runQuery({
    rawSql: sqlToRun,
    workspaceId: params.workspaceId,
  });
}

/**
 * Runs a structured query against its data source: a `Dataset` is compiled
 * straight to DuckDB SQL, while an `EntityConfig` resolves through
 * `EntityFieldValueClient`, which may in turn query many datasets.
 */
async function _runSourceQuery(
  workspaceId: Workspace.Id,
  dataSource: QueryDataSource | undefined,
  executionQuery: StructuredQuery.Partial,
  sortedQueryColumns: ReadonlyArray<
    StructuredQuery.Partial["queryColumns"][number]
  >,
): Promise<QueryResult<UnknownRow>> {
  if (!dataSource || sortedQueryColumns.length === 0) {
    return QueryResultFns.makeEmpty();
  }

  const executionQueryWithSource = {
    ...executionQuery,
    dataSource,
  } as StructuredQuery.T;

  return await Model.match(dataSource, {
    Dataset: async (): Promise<QueryResult<UnknownRow>> => {
      return await WorkspaceQetlClient.runQuery({
        rawSql: StructuredQuery.toRawDuckDbQuery(executionQueryWithSource),
        workspaceId,
      });
    },

    // Entity sources resolve through EntityFieldValueClient, which may in
    // turn query many datasets.
    EntityConfig: async (entityConfig): Promise<QueryResult<UnknownRow>> => {
      return await _runEntityConfigQuery(
        entityConfig,
        sortedQueryColumns,
        workspaceId,
      );
    },
  });
}

/**
 * Runs an entity-source query: resolves the requested fields' values through
 * `EntityFieldValueClient` and remaps the resulting rows into a
 * {@link QueryResult}.
 */
async function _runEntityConfigQuery(
  entityConfig: EntityConfig.T,
  sortedQueryColumns: ReadonlyArray<
    StructuredQuery.Partial["queryColumns"][number]
  >,
  workspaceId: Workspace.Id,
): Promise<QueryResult<UnknownRow>> {
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
): QueryResult<UnknownRow> {
  const queryResultColumns: QueryResultColumn[] = fields.map((field) => {
    return { name: field.name, dataType: field.dataType };
  });

  return {
    id: uuid() as QueryResultId,
    data: rows.map((row) => {
      return makeObjectFromEntries(
        queryResultColumns.map((column) => {
          const field = fields.find((candidate) => {
            return candidate.name === column.name;
          });
          return [column.name, row[field!.id]!];
        }),
      );
    }),
    columns: queryResultColumns,
    numRows: rows.length,
  };
}
