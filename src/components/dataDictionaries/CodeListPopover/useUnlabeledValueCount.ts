import { where } from "@avandar/utils";
import { useQuery } from "@tanstack/react-query";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { buildUnlabeledValueCountSql } from "@/components/dataDictionaries/CodeListPopover/buildUnlabeledValueCountSql/buildUnlabeledValueCountSql";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The binding's conversion, as the count needs it. */
function _toConversion(
  codes: ColumnCodes.T,
  binding: DictionaryBinding.T,
): Parameters<typeof buildUnlabeledValueCountSql>[0]["conversion"] {
  return {
    datasetColumnId: codes.datasetColumnId,
    direction: binding.direction,
    pairs: [...codes.pairs].map((pair) => {
      return { ...pair, acceptedSpellings: [...pair.acceptedSpellings] };
    }),
    isOrdered: codes.isOrdered,
    overrides: binding.valueOverrides,
    keepsOriginalAs: undefined,
    outputDataType: "varchar",
    inputDataType: undefined,
  };
}

/**
 * How many distinct values of a converted column have no label, read on
 * this device when it is first asked for. The query key sits under
 * `DatasetQueryClient`, so whatever refreshes a dataset's rows refreshes
 * the count too. Used by a converted column's code-list popover.
 */
export function useUnlabeledValueCount(
  options: Readonly<{
    datasetId: Dataset.Id;
    columnName: string;
    codes: ColumnCodes.T;
  }>,
): { count: number | undefined } {
  const workspace = useCurrentWorkspace();
  const { datasetId, columnName, codes } = options;
  const [bindings] = DictionaryBindingClient.useGetAll(
    where("dataset_column_id", "eq", codes.datasetColumnId),
  );
  const binding = bindings?.[0];
  // The SQL carries the pairs and overrides, so a changed binding or code
  // list is a new query key.
  const rawSql =
    binding?.mode === "convert"
      ? buildUnlabeledValueCountSql({
          datasetId,
          columnName,
          conversion: _toConversion(codes, binding),
        })
      : undefined;
  const { data } = useQuery({
    queryKey: [
      DatasetQueryClient.getClientName(),
      "unlabeledValueCount",
      workspace.id,
      datasetId,
      rawSql,
    ],
    enabled: rawSql !== undefined,
    queryFn: async () => {
      const result = await WorkspaceQuerySession.runQuery({
        workspaceId: workspace.id,
        rawSql: rawSql ?? "",
      });
      return Number(result.data[0]?.unlabeled_count ?? 0);
    },
  });
  return { count: data };
}
