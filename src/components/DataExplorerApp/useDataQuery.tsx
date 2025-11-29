import { objectEntries } from "$/lib/utils/objects/objectEntries/objectEntries";
import { objectValues } from "$/lib/utils/objects/objectValues/objectValues";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { UnknownRow } from "@/clients/DuckDBClient";
import { DuckDBQueryAggregationType } from "@/clients/DuckDBClient/DuckDBClient.types";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { isOfModelType } from "@/lib/utils/guards/guards";
import {
  valIsOfModelType,
  valNotEq,
} from "@/lib/utils/guards/higherOrderFuncs";
import { makeIdLookupMap } from "@/lib/utils/maps/makeIdLookupMap";
import { makeObjectFromEntries } from "@/lib/utils/objects/builders";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { sortObjList } from "@/lib/utils/objects/sortObjList";
import { Models } from "@/models/Model";
import { QueryColumns } from "@/models/queries/QueryColumn";
import {
  QueryResult,
  QueryResultColumn,
} from "@/models/queries/QueryResult/QueryResult.types";
import { QueryResults } from "@/models/queries/QueryResult/QueryResults";
import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";

type UseDataQueryOptions = {
  query: PartialStructuredQuery;
};

export function useDataQuery({
  query,
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
    enabled: !!dataSource,
    queryKey: [
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
      if (dataSource && sortedQueryColumns.length > 0) {
        const queryResults = await Models.match(dataSource, {
          // Querying datasets is simple. We can just query the dataset
          // directly with the DatasetRawDataClient.
          Dataset: async (dataset): Promise<QueryResult<UnknownRow>> => {
            const queryColumnLookup = makeIdLookupMap(sortedQueryColumns, {
              key: "id",
            });

            // First, we need to convert the structured query into a
            // DuckDB structured query.
            const duckDBAggregations = {} as Record<
              string, // duckdb uses column names for aggregations
              DuckDBQueryAggregationType
            >;
            const groupByColumnNames = [] as string[];

            const atLeastOneColumnHasAggregation = objectValues(
              aggregations,
            ).some(valNotEq("none"));

            objectEntries(aggregations).forEach(([columnId, aggregation]) => {
              const column = queryColumnLookup.get(columnId);
              if (isOfModelType("DatasetColumn", column?.baseColumn)) {
                // "group_by" and "none" are not valid DucKDB aggregations, so
                // we exclude them here.
                if (aggregation !== "group_by" && aggregation !== "none") {
                  duckDBAggregations[column.baseColumn.name] = aggregation;
                } else {
                  // But if the aggregation is "group_by" or there is at least
                  // one other column with an aggregation, then we add this
                  // column to the groupBy list to make sure our SQL query
                  // remains valid.
                  if (
                    atLeastOneColumnHasAggregation ||
                    aggregation === "group_by"
                  ) {
                    groupByColumnNames.push(column.baseColumn.name);
                  }
                }
              }
            });

            const selectColumnNames = sortedQueryColumns.map(
              prop("baseColumn.name"),
            );
            const orderByColumnName =
              orderByColumn && queryColumnLookup.has(orderByColumn) ?
                QueryColumns.getDerivedColumnName(
                  queryColumnLookup.get(orderByColumn)!,
                )
              : undefined;
            return await DatasetRawDataClient.runLocalStructuredQuery({
              query: {
                datasetId: dataset.id,
                aggregations: duckDBAggregations,
                selectColumnNames,
                groupByColumnNames,
                orderByDirection,
                orderByColumnName,
              },
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
              .filter(valIsOfModelType("EntityFieldConfig"));

            // TODO(jpsyx): we still need to apply group bys, aggregations,
            // and sorting. Right now its just returning all values for the
            // requested fields.
            const rows = await EntityFieldValueClient.getAllEntityFieldValues({
              entityConfigId: entityConfig.id,
              entityFieldConfigs: fields,
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
