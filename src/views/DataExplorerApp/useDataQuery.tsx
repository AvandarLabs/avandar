import { useQuery } from "@hooks/useQuery/useQuery";
import { Model } from "@models/Model/Model";
import { prop } from "@utils/objects/hofs/prop/prop";
import { makeObjectFromEntries } from "@utils/objects/makeObjectFromEntries/makeObjectFromEntries";
import { sortObjList } from "@utils/objects/sortObjList/sortObjList";
import { QueryResults } from "$/models/queries/QueryResult/QueryResults";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { WorkspaceQETLClient } from "@/clients/datasets/LocalDatasetClient/QETLClient";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import type { UnknownRow } from "@/clients/DuckDBClient";
import type { UseQueryResultTuple } from "@hooks/useQuery/useQuery";
import type {
  QueryResult,
  QueryResultColumn,
} from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type UseDataQueryOptions = {
  query: StructuredQuery.Partial;
  rawSQL: string | undefined;
  workspaceId: Workspace.Id | undefined;
};

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
export function useDataQuery({
  query,
  rawSQL,
  workspaceId,
}: UseDataQueryOptions): UseQueryResultTuple<QueryResult<UnknownRow>> {
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
  } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });

  return useQuery({
    enabled: !!dataSource || !!rawSQL,
    queryKey: [
      "workspace",
      workspaceId,
      "rawSQL",
      rawSQL,
      "dataSource",
      dataSource,
      "select",
      sortedQueryColumns,
      "aggregations",
      aggregations,
      "orderBy",
      orderByColumn,
      orderByDirection,
    ],

    queryFn: async (): Promise<QueryResult<UnknownRow>> => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required to run a query");
      }

      if (rawSQL) {
        return await WorkspaceQETLClient.runQuery({
          rawSQL,
          workspaceId,
        });
      }

      if (dataSource && sortedQueryColumns.length > 0) {
        const queryResults = await Model.match(dataSource, {
          // Querying datasets is simple. We can just query the dataset
          // directly with the DatasetRawDataClient.
          Dataset: async (): Promise<QueryResult<UnknownRow>> => {
            return await WorkspaceQETLClient.runQuery({
              rawSQL: StructuredQuery.toRawDuckDBQuery(query),
              workspaceId,
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
              workspaceId,
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
      return QueryResults.makeEmpty();
    },
  });
}
