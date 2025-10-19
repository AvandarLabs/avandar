import { match } from "ts-pattern";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { UnknownRow } from "@/clients/DuckDBClient";
import { DuckDBQueryAggregationType } from "@/clients/DuckDBClient/DuckDBClient.types";
import { EntityFieldValueClient } from "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { valNotEq } from "@/lib/utils/guards/higherOrderFuncs";
import { makeIdLookupMap } from "@/lib/utils/maps/builders";
import { makeObjectFromEntries } from "@/lib/utils/objects/builders";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries, objectValues } from "@/lib/utils/objects/misc";
import { sortObjList } from "@/lib/utils/objects/sortObjList";
import {
  QueryResultColumn,
  QueryResultData,
} from "@/models/queries/QueryResultData/QueryResultData.types";
import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";

type UseDataQueryOptions = {
  query: PartialStructuredQuery;
};

export function useDataQuery({
  query,
}: UseDataQueryOptions): UseQueryResultTuple<QueryResultData<UnknownRow>> {
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
  } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("column.id"),
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

    queryFn: async () => {
      if (dataSource && sortedQueryColumns.length > 0) {
        const queryResults = await match(dataSource)
          .with({ type: "Dataset" }, async ({ object: dataset }) => {
            // Querying datasets is simple. We can just query the dataset
            // directly.
            const columnLookup = makeIdLookupMap(sortedQueryColumns, {
              key: "column.id",
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
              const column = columnLookup.get(columnId);
              if (column?.type === "DatasetColumn") {
                // "group_by" and "none" are not valid DucKDB aggregations, so
                // we exclude them here.
                if (aggregation !== "group_by" && aggregation !== "none") {
                  duckDBAggregations[column.column.name] = aggregation;
                } else {
                  // But if the aggregation is "group_by" or there is at least
                  // one other column with an aggregation, then we add this
                  // column to the groupBy list to make sure our SQL query
                  // remains valid.
                  if (
                    atLeastOneColumnHasAggregation ||
                    aggregation === "group_by"
                  ) {
                    groupByColumnNames.push(column.column.name);
                  }
                }
              }
            });

            const selectColumnNames = sortedQueryColumns.map(
              prop("column.name"),
            );
            const orderByColumnName =
              orderByColumn ?
                columnLookup.get(orderByColumn)?.column.name
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
          })
          .with({ type: "EntityConfig" }, async ({ object: entityConfig }) => {
            // TODO(jpsyx): optimize this by using a progressive
            // table-materialization approach
            const fields = sortedQueryColumns
              .filter((col) => {
                return col.type === "EntityFieldConfig";
              })
              .map(prop("column"));

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
                  dataType: field.options.baseDataType,
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
