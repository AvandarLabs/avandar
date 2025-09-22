import { SetFieldType } from "type-fest";
import { LocalDatasetEntryClient } from "@/clients/datasets/LocalDatasetEntryClient";
import { DuckDBClient, UnknownRow } from "@/clients/DuckDBClient";
import {
  QueryResultData,
  StructuredDuckDBQueryConfig,
} from "@/clients/DuckDBClient/types";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { assertIsDefined } from "@/lib/utils/asserts";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { sortStrings } from "@/lib/utils/strings/sort";
import { DatasetId } from "@/models/datasets/Dataset";

type UseDataQueryOptions = {
  datasetId?: DatasetId;
  enabled: boolean;
} & Partial<
  Omit<
    SetFieldType<
      StructuredDuckDBQueryConfig,
      "selectFields",
      Exclude<StructuredDuckDBQueryConfig["selectFields"], "*">
    >,
    "tableName"
  >
>;

export function useDataQuery({
  datasetId,
  aggregations,
  enabled,
  selectFields = [],
  groupByFields = [],
  orderByColumn: orderByField,
  orderByDirection,
}: UseDataQueryOptions): UseQueryResultTuple<QueryResultData<UnknownRow>> {
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
        const datasetEntry = await LocalDatasetEntryClient.getById({
          id: datasetId,
        });

        assertIsDefined(datasetEntry, "Could not find a dataset entry");

        // now run the query
        return await DuckDBClient.runStructuredQuery({
          aggregations,
          selectFields,
          groupByFields,
          orderByDirection,
          orderByColumn: orderByField,
          tableName: datasetEntry.localTableName,
        });
      }
      return { fields: [], data: [], numRows: 0 };
    },
  });
}
