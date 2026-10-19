import { prop, sortObjList, where } from "@avandar/utils";
import { match } from "ts-pattern";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { RelationCsvReader } from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

type ReadRelationCsvOptions = Parameters<RelationCsvReader>[0] & {
  datasetDuckDbLease: DatasetDuckDbLease;
};

/**
 * Loads the CSV with every stored column as text, in the table's column
 * order, so no column takes a type DuckDB guessed from its values. Relation
 * loading then casts each column to the type the dataset stores.
 */
async function _readStoredColumnsAsText(
  options: Readonly<ReadRelationCsvOptions>,
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

/** Loads the CSV with DuckDB inferring each column's type from its values. */
async function _readInferringTypes(
  options: Readonly<ReadRelationCsvOptions>,
): Promise<{ parquetBlob: Blob }> {
  const loaded = await DuckDbClient.loadCsv({
    tableName: options.datasetId,
    fileText: options.csvText,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  return { parquetBlob: loaded.parquetData };
}

/**
 * Reads a live source's acquired CSV into Parquet, typing its columns the
 * way the wrapper that acquired it declared: a source whose schema declares
 * its types is read as text and cast to them, and any other source has its
 * types inferred from the values, the same reader its import used.
 *
 * @returns The rows as Parquet, still to be cast by relation loading.
 */
export async function readRelationCsv(
  options: Readonly<ReadRelationCsvOptions>,
): Promise<{ parquetBlob: Blob }> {
  return await match(options.columnTypes)
    .with("source-schema", () => {
      return _readStoredColumnsAsText(options);
    })
    .with("inferred", () => {
      return _readInferringTypes(options);
    })
    .exhaustive();
}
