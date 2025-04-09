import { LocalQueryClient, LocalQueryConfig } from "@/clients/LocalQueryClient";
import { useQuery, UseQueryResult } from "@/hooks/api/useQuery";
import { objectEntries } from "@/utils/objects";
import { sortStrings } from "@/utils/strings";

export function useDataQuery({
  datasetId,
  aggregations,
  selectFieldNames,
  groupByFieldNames,
}: Partial<LocalQueryConfig>): UseQueryResult<Array<Record<string, unknown>>> {
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
      return [];
    },
  });
}
