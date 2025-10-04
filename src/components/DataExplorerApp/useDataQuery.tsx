import { match } from "ts-pattern";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { UnknownRow } from "@/clients/DuckDBClient";
import {
  QueryAggregationType,
  QueryResultColumn,
  QueryResultData,
} from "@/clients/DuckDBClient/types";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { makeObjectFromEntries } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { sortStrings } from "@/lib/utils/strings/sort";
import { OrderByDirection } from "./DataExplorerContext/types";
import { QueryableColumn } from "./QueryableColumnMultiSelect";
import { QueryableDataSource } from "./QueryableDataSourceSelect";

type UseDataQueryOptions = {
  dataSource?: QueryableDataSource;
  enabled: boolean;
  selectColumns: readonly QueryableColumn[];
  groupByColumns: readonly QueryableColumn[];
  orderByColumn: QueryableColumn | undefined;
  orderByDirection: OrderByDirection | undefined;

  /**
   * Aggregations to apply to the selected columns
   * **NOTE**: The key is the column name (not the column id).
   */
  aggregations: Record<string, QueryAggregationType>;
  offset?: number;
  limit?: number;
};

export function useDataQuery({
  dataSource,
  enabled,
  selectColumns = [],
  groupByColumns = [],
  orderByColumn,
  orderByDirection,
  aggregations,
  offset,
  limit,
}: UseDataQueryOptions): UseQueryResultTuple<QueryResultData<UnknownRow>> {
  const dataSourceId = dataSource?.value.id;
  const selectColumnNames = selectColumns.map(getProp("value.name"));
  const groupByColumnNames = groupByColumns.map(getProp("value.name"));

  const sortedColumnNames = sortStrings(selectColumnNames);
  const sortedGroupByNames = sortStrings(groupByColumnNames);
  const sortedAggregations = sortStrings(
    objectEntries(aggregations ?? {}).map(([fieldName, aggType]) => {
      return `${fieldName}:${aggType}`;
    }),
  );
  const orderByColumnName = orderByColumn?.value.name;

  return useQuery({
    enabled: enabled && !!dataSourceId,

    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      "dataQuery",
      dataSourceId,
      "select",
      ...sortedColumnNames,
      "aggregations",
      ...sortedAggregations,
      "groupBy",
      ...sortedGroupByNames,
      "orderBy",
      orderByColumnName,
      orderByDirection,
      "offset",
      offset,
      "limit",
      limit,
    ],

    queryFn: async () => {
      if (
        dataSource !== undefined &&
        dataSourceId &&
        aggregations &&
        selectColumns.length > 0
      ) {
        const queryResults = await match(dataSource)
          .with({ type: "Dataset" }, async ({ value: dataset }) => {
            // Querying datasets is simple. We can just query the dataset
            // directly.
            return await DatasetRawDataClient.runLocalStructuredQuery({
              query: {
                datasetId: dataset.id,
                aggregations,
                selectColumnNames,
                groupByColumnNames,
                orderByDirection,
                orderByColumnName,
              },
            });
          })
          .with({ type: "EntityConfig" }, async ({ value: entityConfig }) => {
            // TODO(jpsyx): optimize this to use a table-materialization
            // approach
            const fields = selectColumns
              .filter((col) => {
                return col.type === "EntityFieldConfig";
              })
              .map(getProp("value"));
            const rows = await EntityFieldValueClient.getAllEntityFieldValues({
              entityConfigId: entityConfig.id,
              entityFieldConfigs: fields,
            });

            const queryResultColumns: QueryResultColumn[] = fields.map(
              (field) => {
                return {
                  name: field.name,
                  dataType:
                    field.options.baseDataType === "string" ?
                      "text"
                    : field.options.baseDataType,
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
          })
          .exhaustive();

        return queryResults;
      }

      return { columns: [], data: [], numRows: 0 };
    },
  });
}
