import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useDatasetColumnCodes } from "@/hooks/dataDictionaries/useDatasetColumnCodes/useDatasetColumnCodes";
import {
  getResultColumnCodes,
  getSourceDatasetId,
} from "@/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ProjectionDescriptor } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";

const NO_CODES: ReadonlyMap<string, ColumnCodes.T> = new Map();

/**
 * The code list of each Data Explorer result column that is a bound dataset
 * column selected as is, by result column name, for the grid's column
 * titles. A query over several datasets, or one the SQL reader cannot
 * follow, gets none. Used by `DataExplorerApp`.
 */
export function useExplorerColumnCodes(
  projections: readonly ProjectionDescriptor[],
): ReadonlyMap<string, ColumnCodes.T> {
  const datasetId = getSourceDatasetId(projections);
  const [columns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: { enabled: datasetId !== undefined },
  });
  const { byColumnName } = useDatasetColumnCodes({ datasetId, columns });
  return useMemo(() => {
    return datasetId
      ? getResultColumnCodes({
          projections,
          datasetId,
          codesByColumnName: byColumnName,
        })
      : NO_CODES;
  }, [datasetId, projections, byColumnName]);
}
