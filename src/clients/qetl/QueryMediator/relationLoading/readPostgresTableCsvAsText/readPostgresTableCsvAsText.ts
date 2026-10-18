import { prop, sortObjList, where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

/** Input to {@link readPostgresTableCsvAsText}. */
export type ReadPostgresTableCsvAsTextOptions = {
  datasetId: Dataset.Id;
  csvText: string;
  datasetDuckDbLease: DatasetDuckDbLease;
};

/**
 * Reads one Postgres relation's CSV into Parquet with every stored column as
 * text, so no column takes a type DuckDB's sniff guessed from its values: a
 * text column of zip codes would otherwise lose its leading zeros as a
 * number. A Postgres dataset stores each column's declared type as its
 * queryable type, and relation loading casts this text to it.
 */
export async function readPostgresTableCsvAsText(
  options: Readonly<ReadPostgresTableCsvAsTextOptions>,
): Promise<{ parquetBlob: Blob }> {
  const storedColumns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "eq", options.datasetId));
  const columnsInTableOrder = sortObjList(storedColumns, {
    sortBy: prop("columnIdx"),
  });
  const loaded = await DuckDbClient.loadCsv({
    tableName: options.datasetId,
    fileText: options.csvText,
    datasetDuckDbLease: options.datasetDuckDbLease,
    columns: columnsInTableOrder.map((column) => {
      return [column.originalName, "VARCHAR"] as const;
    }),
  });
  return { parquetBlob: loaded.parquetData };
}
