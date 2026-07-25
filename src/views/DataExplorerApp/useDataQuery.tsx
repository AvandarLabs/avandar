import { useQuery } from "@hooks";
import { useLingui } from "@lingui/react/macro";
import { Model } from "@models";
import { makeObjectFromEntries, prop, sortObjList } from "@utils";
import { uuid } from "$/lib/uuid";
import { DashboardId } from "$/models/Dashboard/Dashboard.types";
import { QueryResult as QueryResultFns } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { PublicQETLClient } from "@/clients/qetl/PublicQETLClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { resolveManualQueryForExecution } from "@/views/DataExplorerApp/resolveManualQueryForExecution";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { UseQueryResultTuple } from "@hooks";
import type {
  QueryResult,
  QueryResultColumn,
  QueryResultId,
} from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type UseDataQueryOptions = {
  query: StructuredQuery.Partial;
  rawSQL: string | undefined;
  /**
   * When true, `rawSQL` was generated from the manual form and row-count guard
   * logic may replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;
} & (
  | {
      auth: "workspace";
      workspaceId: Workspace.Id;
    }
  | {
      auth: "public";
      publicAvaPageId: DashboardId;
    }
);

/**
 * This is the main hook in the DataExplorerApp that will query the data.
 * This hook calls the appropriate clients to query the data, which in turn
 * will call the appropriate sub-systems to pull the source data.
 *
 * If the workspaceId is `undefined` then the query will be run as a public
 * user.
 *
 * TODO(jpsyx): we should not support public querying here. That is just
 * a stopgap. We should have a proper usePublicDataQuery hook to handle
 * it properly.
 */
export function useDataQuery(
  options: UseDataQueryOptions,
): UseQueryResultTuple<QueryResult<UnknownRow>> {
  const { t } = useLingui();
  const { auth, query, rawSQL, isStructuredQueryInSync = true } = options;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const workspaceId =
    auth === "workspace" ? options.workspaceId : options.publicAvaPageId;

  const queryResult = useQuery({
    enabled: !!dataSource || !!rawSQL,
    queryKey: [
      auth,
      workspaceId,
      query,
      "rawSQL",
      rawSQL,
      "dataSource",
      dataSource,
      "select",
      sortedQueryColumns,
      "structuredInSync",
      isStructuredQueryInSync,
    ],
    queryFn: async (): Promise<QueryResult<UnknownRow>> => {
      // When the user (or LLM) has set `rawSQL`, run it verbatim. Skip the
      // large-dataset auto-limit resolution and the structured-form round-trip
      // entirely so direct SQL is never silently rewritten.
      const resolved =
        rawSQL === undefined && auth === "workspace" ?
          await resolveManualQueryForExecution({
            query,
            workspaceId: workspaceId as Workspace.Id,
          })
        : { query, didAutoLimit: false as const };
      const executionQuery = resolved.query;

      const sqlToRun = selectSqlToExecute({
        rawSQL,
        isStructuredQueryInSync,
        executionQuery,
      });

      if (sqlToRun) {
        if (auth === "public") {
          // if no workspace id then this is a public query
          return await PublicQETLClient.runQuery({
            rawSQL: sqlToRun,
            dashboardId: options.publicAvaPageId,
          });
        }

        return await WorkspaceQETLClient.runQuery({
          rawSQL: sqlToRun,
          workspaceId: options.workspaceId,
        });
      }

      if (auth === "public") {
        throw new Error(
          t`Public queries are not supported for structured queries. Use raw SQL instead.`,
        );
      }

      if (dataSource && sortedQueryColumns.length > 0) {
        const executionQueryWithSource = {
          ...executionQuery,
          dataSource,
        } as StructuredQuery.T;
        const queryResults = await Model.match(dataSource, {
          // Querying datasets is simple. We can just query the dataset
          // directly with the DatasetRawDataClient.
          Dataset: async (): Promise<QueryResult<UnknownRow>> => {
            return await WorkspaceQETLClient.runQuery({
              rawSQL: StructuredQuery.toRawDuckDBQuery(
                executionQueryWithSource,
              ),
              workspaceId: options.workspaceId,
            });
          },

          // querying entities is more complex and needs to go through
          // EntityFieldValueClient, which in turn might need to query many
          // other datasets.
          EntityConfig: async (
            entityConfig,
          ): Promise<QueryResult<UnknownRow>> => {
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
              workspaceId: options.workspaceId,
            });

            const queryResultColumns: QueryResultColumn[] = fields.map(
              (field) => {
                return {
                  name: field.name,
                  dataType: field.dataType,
                };
              },
            );

            return {
              id: uuid() as QueryResultId,
              data: rows.map((row) => {
                return makeObjectFromEntries(
                  queryResultColumns.map((col) => {
                    const field = fields.find((f) => {
                      return f.name === col.name;
                    });

                    return [col.name, row[field!.id]!];
                  }),
                );
              }),
              columns: queryResultColumns,
              numRows: rows.length,
            };
          },
        });

        return queryResults;
      }
      return QueryResultFns.makeEmpty();
    },
  });

  return queryResult;
}
