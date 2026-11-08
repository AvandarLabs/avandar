import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { match } from "ts-pattern";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { PublicQuerySession } from "@/clients/qetl/PublicQuerySession/PublicQuerySession";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { makeExecutableQueryFromManualQuery } from "@/views/DataExplorerApp/makeExecutableQueryFromManualQuery/makeExecutableQueryFromManualQuery";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  RunStructuredQueryParams,
  RunStructuredQueryResult,
  StructuredQueryAuth,
} from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

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
  didAutoLimit: boolean;
}> {
  const { query, rawSql, isStructuredQueryInSync = true } = params;

  const resolved =
    rawSql === undefined
      ? await match(params)
          .with({ auth: "workspace" }, async ({ workspaceId }) => {
            return await makeExecutableQueryFromManualQuery({
              query,
              workspaceId,
            });
          })
          .with({ auth: "public" }, () => {
            return { query, didAutoLimit: false as const };
          })
          .with({ auth: "workspace_published" }, () => {
            return { query, didAutoLimit: false as const };
          })
          .exhaustive()
      : { query, didAutoLimit: false as const };

  const sqlToRun = selectSqlToExecute({
    rawSql,
    isStructuredQueryInSync,
    executionQuery: resolved.query,
  });

  return {
    sqlToRun,
    executionQuery: resolved.query,
    didAutoLimit: resolved.didAutoLimit,
  };
}

/** Runs already-compiled SQL against the client that matches the auth mode. */
async function _runRawSql(
  params: RunStructuredQueryParams,
  sqlToRun: string,
): Promise<QueryResult.T<UnknownRow>> {
  return await match(params)
    .with({ auth: "workspace" }, async ({ workspaceId }) => {
      return await WorkspaceQuerySession.runQuery({
        rawSql: sqlToRun,
        workspaceId,
      });
    })
    .with({ auth: "public" }, async ({ publicAvaPageId, snapshotRevision }) => {
      return await PublicQuerySession.runQuery({
        rawSql: sqlToRun,
        dashboardId: publicAvaPageId,
        visibility: "public",
        snapshotRevision,
      });
    })
    .with(
      { auth: "workspace_published" },
      async ({ publicAvaPageId, snapshotRevision }) => {
        return await PublicQuerySession.runQuery({
          rawSql: sqlToRun,
          dashboardId: publicAvaPageId,
          visibility: "workspace",
          snapshotRevision,
        });
      },
    )
    .exhaustive();
}

/** Builds the translated error shown when a snapshot receives a form query. */
function _createStructuredSnapshotQueryError(): Error {
  return new Error(
    i18n._(
      msg`Public queries are not supported for structured queries. Use raw SQL instead.`,
    ),
  );
}

/** Returns workspace auth or rejects a snapshot's structured query. */
function _getWorkspaceAuthFromStructuredQuery(
  params: Readonly<RunStructuredQueryParams>,
): Extract<StructuredQueryAuth, { auth: "workspace" }> {
  return match(params)
    .with({ auth: "workspace" }, (workspaceParams) => {
      return workspaceParams;
    })
    .with({ auth: "public" }, () => {
      throw _createStructuredSnapshotQueryError();
    })
    .with({ auth: "workspace_published" }, () => {
      throw _createStructuredSnapshotQueryError();
    })
    .exhaustive();
}

/**
 * Runs a structured query against its data source. A dataset and a case type
 * both compile to SQL: a case type's SQL names its `concept_<id>` view, which
 * QETL builds inside the query's lease.
 */
async function _runSourceQuery({
  workspaceId,
  dataSource,
  executionQuery,
  queryColumnCount,
}: {
  workspaceId: Workspace.Id;
  dataSource: QueryDataSource.T | undefined;
  executionQuery: StructuredQuery.Partial;
  queryColumnCount: number;
}): Promise<QueryResult.T<UnknownRow>> {
  if (!dataSource || queryColumnCount === 0) {
    return QueryResult.makeEmpty();
  }

  const executionQueryWithSource = {
    ...executionQuery,
    dataSource,
  } as StructuredQuery.T;

  return await WorkspaceQuerySession.runQuery({
    rawSql: StructuredQuery.toRawDuckDbQuery(executionQueryWithSource),
    workspaceId,
  });
}

/**
 * Runs a structured query (or caller-supplied raw SQL) against the right QETL
 * client. Every data source, case types included, is compiled to SQL and run
 * through the workspace query session.
 *
 * This is the single execution path shared by the Data Explorer and the GIS
 * app. Callers wrap it in their own caching hook.
 */
export async function runStructuredQueryWithMetadata(
  params: RunStructuredQueryParams,
): Promise<RunStructuredQueryResult> {
  if (params.rawSql === undefined) {
    _getWorkspaceAuthFromStructuredQuery(params);
  }

  const { query } = params;
  const { dataSource, queryColumns } = query;

  const { sqlToRun, executionQuery, didAutoLimit } =
    await _selectSqlForExecution(params);

  if (sqlToRun) {
    return {
      result: await _runRawSql(params, sqlToRun),
      didAutoLimit,
      executedSql: sqlToRun,
    };
  }

  return {
    result: await _runSourceQuery({
      workspaceId: _getWorkspaceAuthFromStructuredQuery(params).workspaceId,
      dataSource,
      executionQuery,
      queryColumnCount: queryColumns.length,
    }),
    didAutoLimit,
    executedSql: sqlToRun,
  };
}
