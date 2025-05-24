import {
  LocalDatasetQueryClient,
  LocalQueryConfig,
  LocalQueryResultData,
} from "@/clients/LocalDatasetQueryClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { objectEntries } from "@/lib/utils/objects/misc";
import { sortStrings } from "@/lib/utils/strings/sort";

export function useDataQuery({
  datasetId,
  aggregations,
  selectFieldNames,
  groupByFieldNames,
  enabled,
}: Partial<LocalQueryConfig> & {
  enabled: boolean;
}): UseQueryResultTuple<LocalQueryResultData> {
  const sortedFieldNames = sortStrings(selectFieldNames ?? []);
  const sortedGroupByNames = sortStrings(groupByFieldNames ?? []);
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
    ],

    queryFn: () => {
      if (
        aggregations &&
        datasetId !== undefined &&
        sortedFieldNames.length > 0
      ) {
        return LocalDatasetQueryClient.runQuery({
          datasetId,
          aggregations,
          selectFieldNames: sortedFieldNames,
          groupByFieldNames: sortedGroupByNames,
        });
      }
      return { fields: [], data: [] };
    },
  });
}
