import * as R from "remeda";
import { LocalQueryClient, LocalQueryConfig } from "@/clients/LocalQueryClient";
import { useQuery, UseQueryResult } from "@/hooks/api/useQuery";

export function useDataQuery({
  datasetId,
  fieldNames,
}: Partial<LocalQueryConfig>): UseQueryResult<Array<Record<string, unknown>>> {
  const sortedFieldnames = R.sort(fieldNames ?? [], (a, b) => {
    return a.localeCompare(b);
  });

  return useQuery({
    queryKey: ["dataQuery", datasetId, ...sortedFieldnames],
    queryFn: () => {
      if (datasetId !== undefined && sortedFieldnames.length > 0) {
        return LocalQueryClient.runQuery({
          datasetId,
          fieldNames: sortedFieldnames,
        });
      }
      return [];
    },
  });
}
