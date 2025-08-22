import { DatasetRawDataClient } from "@/clients/datsets/DatasetRawDataClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import {
  LocalQueryConfig,
  LocalQueryResultData,
} from "@/clients/LocalDatasetQueryClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { sortStrings } from "@/lib/utils/strings/sort";

export function useDataQuery({
  datasetId,
  aggregations,
  enabled,
  selectFields = [],
  groupByFields = [],
  orderByColumn: orderByField,
  orderByDirection,
}: Partial<LocalQueryConfig> & {
  enabled: boolean;
}): UseQueryResultTuple<LocalQueryResultData> {
  const selectFieldNames = selectFields.map(getProp("name"));
  const groupByFieldNames = groupByFields.map(getProp("name"));

  const sortedFieldNames = sortStrings(selectFieldNames);
  const sortedGroupByNames = sortStrings(groupByFieldNames);
  const sortedAggregations = sortStrings(
    objectEntries(aggregations ?? {}).map(([fieldName, aggType]) => {
      return `${fieldName}:${aggType}`;
    }),
  );

  return useQuery({
    enabled,

    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      "dataQuery",
      datasetId,
      "select",
      ...sortedFieldNames,
      "aggregations",
      ...sortedAggregations,
      "groupBy",
      ...sortedGroupByNames,
      "orderBy",
      orderByField?.name,
      orderByDirection,
    ],

    queryFn: async () => {
      if (aggregations && datasetId !== undefined && selectFields.length > 0) {
        // load the necessary dataset into the db
        await DatasetRawDataClient.loadDataset({ datasetId });

        // now run the query
        return DuckDBClient.runStructuredQuery({
          datasetId,
          aggregations,
          selectFields,
          groupByFields,
          orderByColumn: orderByField,
          orderByDirection,
        });
      }
      return { fields: [], data: [] };
    },
  });
}
