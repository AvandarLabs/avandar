import * as R from "remeda";
import { LocalQueryClient, LocalQueryConfig } from "@/clients/LocalQueryClient";
import { useQuery, UseQueryResult } from "@/hooks/api/useQuery";
import { sortStrings, stringComparator } from "@/utils/strings";

export function useDataQuery({
  datasetId,
  aggregations,
  selectFieldNames,
  groupByFieldNames,
}: Partial<LocalQueryConfig>): UseQueryResult<Array<Record<string, unknown>>> {
  const sortedFieldNames = sortStrings(selectFieldNames ?? []);
  const sortedGroupByNames = sortStrings(groupByFieldNames ?? []);
  const sortedAggregations = R.pipe(
    R.entries(aggregations ?? {}),
    R.map(([fieldName, aggType]) => {
      return `${fieldName}:${aggType}`;
    }),
    R.sort(stringComparator),
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
