import { propEq } from "@utils";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { SqlMappingInput } from "$/models/queries/StructuredQuery/sqlToStructuredQuery";

/**
 * Groups workspace dataset columns by dataset for `sqlToStructuredQuery`.
 */
export function buildSqlMappingDatasets(
  datasets: ReadonlyArray<DatasetModel["Read"]>,
  allColumns: readonly DatasetColumnRead[],
): SqlMappingInput["datasets"] {
  return datasets.map((dataset) => {
    const columns = allColumns.filter(propEq("datasetId", dataset.id));
    return { dataset, columns };
  });
}
