import { Model } from "@models";
import { makeObjectFromEntries, prop, sortObjList } from "@utils";
import { uuid } from "$/lib/uuid";
import { QueryResult as QueryResultFns } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { PublicQETLClient } from "@/clients/qetl/PublicQETLClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { resolveManualQueryForExecution } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
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
  const { query, rawSql, isStructuredQueryInSync = true } = params;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, { sortBy: prop("id") });

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

  if (sqlToRun) {
    if (params.auth === "public") {
      return await PublicQETLClient.runQuery({
        rawSql: sqlToRun,
        dashboardId: params.publicAvaPageId,
      });
    }
    return await WorkspaceQETLClient.runQuery({
      rawSql: sqlToRun,
      workspaceId: params.workspaceId,
    });
  }

  if (params.auth === "public") {
    throw new Error(
      "Public queries are not supported for structured queries. " +
        "Use raw SQL instead.",
    );
  }

  if (!dataSource || sortedQueryColumns.length === 0) {
    return QueryResultFns.makeEmpty();
  }

  const { workspaceId } = params;
  const executionQueryWithSource = {
    ...resolved.query,
    dataSource,
  } as StructuredQuery.T;

  return await Model.match(dataSource, {
    Dataset: async (): Promise<QueryResult<UnknownRow>> => {
      return await WorkspaceQETLClient.runQuery({
        rawSql: StructuredQuery.toRawDuckDBQuery(executionQueryWithSource),
        workspaceId,
      });
    },

    // Entity sources resolve through EntityFieldValueClient, which may in turn
    // query many datasets.
    EntityConfig: async (entityConfig): Promise<QueryResult<UnknownRow>> => {
      const fields = sortedQueryColumns
        .map(prop("baseColumn"))
        .filter(Model.valIsOfModelType("EntityFieldConfig"));

      const rows = await EntityFieldValueClient.getAllEntityFieldValues({
        entityConfigId: entityConfig.id,
        entityFieldConfigs: fields,
        workspaceId,
      });

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
    },
  });
}
