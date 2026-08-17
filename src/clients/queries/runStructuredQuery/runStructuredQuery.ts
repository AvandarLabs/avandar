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
import { match } from "ts-pattern";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { PublicQetlClient } from "@/clients/qetl/PublicQetlClient/PublicQetlClient";
import { WorkspaceQetlClient } from "@/clients/qetl/WorkspaceQetlClient/WorkspaceQetlClient";
import { resolveManualQueryForExecution } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A structured query's columns, in the stable order execution expects. */
type SortedQueryColumns = ReadonlyArray<
  StructuredQuery.Partial["queryColumns"][number]
>;

/** Who is asking, which decides which QETL client answers. */
export type StructuredQueryAuth =
  | { auth: "workspace"; workspaceId: Workspace.Id }
  | {
      auth: "public";
      publicAvaPageId: Dashboard.Id;
      snapshotRevision: string;
    }
  | {
      auth: "workspace_published";
      publicAvaPageId: Dashboard.Id;
      snapshotRevision: string;
    };

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
    rawSql === undefined ?
      await match(params)
        .with({ auth: "workspace" }, async ({ workspaceId }) => {
          return await resolveManualQueryForExecution({ query, workspaceId });
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

  return { sqlToRun, executionQuery: resolved.query };
}

/** Runs already-compiled SQL against the client that matches the auth mode. */
async function _runRawSql(
  params: RunStructuredQueryParams,
  sqlToRun: string,
): Promise<QueryResult.T<UnknownRow>> {
  return await match(params)
    .with({ auth: "workspace" }, async ({ workspaceId }) => {
      return await WorkspaceQetlClient.runQuery({
        rawSql: sqlToRun,
        workspaceId,
      });
    })
    .with({ auth: "public" }, async ({ publicAvaPageId, snapshotRevision }) => {
      return await PublicQetlClient.runQuery({
        rawSql: sqlToRun,
        dashboardId: publicAvaPageId,
        visibility: "public",
        snapshotRevision,
      });
    })
    .with(
      { auth: "workspace_published" },
      async ({ publicAvaPageId, snapshotRevision }) => {
        return await PublicQetlClient.runQuery({
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

    // Individual sources resolve through AttributeAssertionClient, which may in
    // turn query many datasets.
    Concept: async (concept): Promise<QueryResult.T<UnknownRow>> => {
      return await _runConceptQuery({
        concept,
        sortedQueryColumns,
        workspaceId,
      });
    },
  });
}

/**
 * Runs an individual-source query.
 *
 * @returns The requested attributes' values, keyed by attribute name.
 */
async function _runConceptQuery({
  concept,
  sortedQueryColumns,
  workspaceId,
}: {
  concept: Concept.T;
  sortedQueryColumns: SortedQueryColumns;
  workspaceId: Workspace.Id;
}): Promise<QueryResult.T<UnknownRow>> {
  // TODO(jpsyx): optimize this by using a progressive
  // table-materialization approach
  const attributes = sortedQueryColumns
    .map(prop("baseColumn"))
    .filter(Model.valIsOfModelType("ConceptAttribute"));

  // TODO(jpsyx): we still need to apply group bys, aggregations,
  // and sorting. Right now its just returning all values for the
  // requested attributes.
  const rows = await AttributeAssertionClient.getConceptExtension({
    conceptId: concept.id,
    conceptAttributes: attributes,
    workspaceId,
  });

  return _buildConceptQueryResult(attributes, rows);
}

/**
 * Builds a {@link QueryResult} out of the raw rows `AttributeAssertionClient`
 * returns, remapping each row from attribute ids to the attribute names the
 * rest of the query pipeline expects columns to be keyed by.
 */
function _buildConceptQueryResult(
  attributes: readonly ConceptAttribute.T[],
  rows: ReadonlyArray<Record<ConceptAttribute.Id, unknown>>,
): QueryResult.T<UnknownRow> {
  const queryResultColumns: QueryResult.Column[] = attributes.map(
    pickProps(["name", "dataType"]),
  );

  return {
    id: uuid<QueryResult.Id>(),
    // Mapping over `attributes` rather than over the derived columns keeps
    // each attribute's id in hand, so no per-row lookup back into
    // `attributes` is needed.
    data: rows.map((row) => {
      return makeObjectFromEntries(
        attributes.map((attribute) => {
          return [attribute.name, row[attribute.id]];
        }),
      );
    }),
    columns: queryResultColumns,
    numRows: rows.length,
  };
}

/**
 * Runs a structured query (or caller-supplied raw SQL) against the right QETL
 * client, resolving dataset and individual sources.
 *
 * This is the single execution path shared by the Data Explorer and the GIS
 * app. Callers wrap it in their own caching hook rather than duplicating the
 * source-resolution branches.
 */
export async function runStructuredQuery(
  params: RunStructuredQueryParams,
): Promise<QueryResult.T<UnknownRow>> {
  if (params.rawSql === undefined) {
    _getWorkspaceAuthFromStructuredQuery(params);
  }

  const { query } = params;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, { sortBy: prop("id") });

  const { sqlToRun, executionQuery } = await _selectSqlForExecution(params);

  if (sqlToRun) {
    return await _runRawSql(params, sqlToRun);
  }

  return await _runSourceQuery({
    workspaceId: _getWorkspaceAuthFromStructuredQuery(params).workspaceId,
    dataSource,
    executionQuery,
    sortedQueryColumns,
  });
}
