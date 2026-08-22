import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { NodeDuckDb } from "@etl/NodeDuckDb/NodeDuckDb";
import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";

/**
 * Column metadata for CSV → Parquet conversion (DuckDB cast names).
 */
export type TransformedColumnDescription = Readonly<{
  name: string;
  type: DuckDbSniffableDataType;
}>;

/**
 * One transformed table: `<name>.csv` under the transform output directory.
 */
export type TransformedDataDescriptionForParquet = Readonly<{
  name: string;
  columns: readonly TransformedColumnDescription[];
}>;

/**
 * For each description, reads `transformOutputDir/<name>.csv` and returns ZSTD
 * Parquet blobs in description order. An empty `columns` array exports the
 * fully inferred table; otherwise each column must include a sniffable type
 * for explicit `read_csv` casts.
 */
export async function transformedCsvsToParquetBlobs(options: {
  transformOutputDir: string;
  descriptions: readonly TransformedDataDescriptionForParquet[];
}): Promise<Blob[]> {
  const { transformOutputDir, descriptions } = options;
  const db = new NodeDuckDb();
  try {
    const blobs: Blob[] = [];

    // Sequential on purpose, so the `await`s below are not a mistake. Every
    // iteration issues statements against the one `NodeDuckDb` handle opened
    // above, and each export materialises a whole Parquet buffer in memory.
    // Running these concurrently would interleave statements on a single
    // connection and hold every table in memory at once, which is exactly what
    // this pipeline cannot afford on bulk CSVs.
    for (const description of descriptions) {
      const csvPath = resolve(transformOutputDir, `${description.name}.csv`);
      const viewName = `etl_${randomUUID().replace(/-/g, "_")}`;
      const { columns } = description;

      // No declared columns means the transform is happy for DuckDB to infer
      // the schema. Otherwise every column type is pinned, so the Parquet
      // matches the transform's contract rather than whatever the CSV suggests.
      const readOptions =
        columns.length === 0
          ? { csvPath, viewName, header: true, autoDetect: true }
          : {
              csvPath,
              viewName,
              header: true,
              autoDetect: false,
              columns: columns.map((column) => {
                return { name: column.name, type: column.type };
              }),
            };

      // react-doctor-disable-next-line
      await db.readCsvIntoView(readOptions);
      // react-doctor-disable-next-line
      const bytes = await db.exportTableOrViewAsZSTDParquetBlob(viewName);
      blobs.push(
        new Blob([Buffer.from(bytes)], { type: "application/octet-stream" }),
      );
    }
    return blobs;
  } finally {
    await db.close();
  }
}
