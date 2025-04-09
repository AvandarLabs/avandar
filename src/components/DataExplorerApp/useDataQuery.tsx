import {
  LocalQueryClient,
  LocalQueryConfig,
  LocalQueryResultData,
} from "@/clients/LocalQueryClient";
import { useQuery, UseQueryResult } from "@/lib/hooks/query/useQuery";
import { objectEntries } from "@/lib/utils/objects";
import { sortStrings } from "@/lib/utils/strings";

export function useDataQuery({
  datasetId,
  aggregations,
  selectFieldNames,
  groupByFieldNames,
}: Partial<LocalQueryConfig>): UseQueryResult<LocalQueryResultData> {
  const sortedFieldNames = sortStrings(selectFieldNames ?? []);
  const sortedGroupByNames = sortStrings(groupByFieldNames ?? []);
  const sortedAggregations = sortStrings(
    objectEntries(aggregations ?? {}).map(([fieldName, aggType]) => {
      return `${fieldName}:${aggType}`;
    }),
  );

  return useQuery({
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
        return LocalQueryClient.runQuery({
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
