import {
  LocalDatasetQueryClient,
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
    ],

    queryFn: async () => {
      if (aggregations && datasetId !== undefined && selectFields.length > 0) {
        // load the necessary dataset into the db
        await LocalDatasetQueryClient.loadDataset(datasetId);

        // now run the query
        return LocalDatasetQueryClient.runQuery({
          datasetId,
          aggregations,
          selectFields,
          groupByFields,
        });
      }
      return { fields: [], data: [] };
    },
  });
}
