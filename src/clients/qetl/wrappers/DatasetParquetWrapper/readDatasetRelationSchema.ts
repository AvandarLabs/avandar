import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationSchema } from "$/models/relations/RelationSchema/RelationSchema.types";

import { where } from "@avandar/utils";

import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { AvaQueryClient } from "@/config/AvaQueryClient";

/**
 * Reads a dataset's columns from the stored column records, which every
 * dataset source type shares, and converts each stored Avandar data type to
 * the DuckDB type the relation exposes. This is the same conversion the
 * relation
 * loader applies when it renames and retypes columns on load, so a described
 * schema and a loaded table agree.
 *
 * Lives beside `DatasetParquetWrapper` because it is that wrapper's default
 * `describe`; `VirtualDatasetWrapper` shares it because a virtual dataset's
 * columns are stored the same way.
 */
export async function readDatasetRelationSchema(
  datasetId: Dataset.Id,
): Promise<RelationSchema> {
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", [datasetId]));
  return {
    columns: columns.map((column) => {
      return {
        name: column.name,
        dataType: DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType),
        // A dataset column is always single-valued: `DatasetColumn` has no
        // array flag, and Parquet ingest produces one scalar per cell. Only a
        // concept attribute can be array-valued.
        isArray: false,
      };
    }),
  };
}
