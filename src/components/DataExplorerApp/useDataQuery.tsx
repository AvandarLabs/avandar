import * as R from "remeda";
import { LocalQueryClient, LocalQueryConfig } from "@/clients/LocalQueryClient";
import { useQuery, UseQueryResult } from "@/hooks/api/useQuery";

export function useDataQuery({
  datasetId,
  selectFieldNames: fieldNames,
  groupByFieldNames,
}: Partial<LocalQueryConfig>): UseQueryResult<Array<Record<string, unknown>>> {
  const sortedFieldNames = R.sort(fieldNames ?? [], (a, b) => {
    return a.localeCompare(b);
  });
  const sortedGroupByNames = R.sort(groupByFieldNames ?? [], (a, b) => {
    return a.localeCompare(b);
  });

  return useQuery({
    queryKey: [
      "dataQuery",
      datasetId,
      "select",
      ...sortedFieldNames,
      "groupBy",
      ...sortedGroupByNames,
    ],
    queryFn: () => {
      if (datasetId !== undefined && sortedFieldNames.length > 0) {
        return LocalQueryClient.runQuery({
          datasetId,
          selectFieldNames: sortedFieldNames,
          groupByFieldNames: sortedGroupByNames,
        });
      }
      return [];
    },
  });
}
