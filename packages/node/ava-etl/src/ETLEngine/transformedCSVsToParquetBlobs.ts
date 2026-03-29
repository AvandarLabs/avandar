import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { NodeDuckDB } from "@ava-etl/NodeDuckDB/NodeDuckDB";
import type { DuckDBSniffableDataType } from "@ava-etl/NodeDuckDB/DuckDBSniffableDataType";

/**
 * Column metadata for CSV → Parquet conversion (DuckDB cast names).
 */
export type TransformedColumnDescription = Readonly<{
  name: string;
  type: DuckDBSniffableDataType;
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
export async function transformedCSVsToParquetBlobs(options: {
  transformOutputDir: string;
  descriptions: readonly TransformedDataDescriptionForParquet[];
}): Promise<Blob[]> {
  const { transformOutputDir, descriptions } = options;
  const db = new NodeDuckDB();
  try {
    const blobs: Blob[] = [];
    for (const description of descriptions) {
      const csvPath = resolve(transformOutputDir, `${description.name}.csv`);
      const viewName = `etl_${randomUUID().replace(/-/g, "_")}`;
      const { columns } = description;

      if (columns.length === 0) {
        await db.readCSVIntoView({
          csvPath,
          viewName,
          autoDetect: true,
          header: true,
        });
        const bytes = await db.exportTableOrViewAsZSTDParquetBlob(viewName);
        blobs.push(
          new Blob([Buffer.from(bytes)], { type: "application/octet-stream" }),
        );
        continue;
      }

      const duckColumns = columns.map((column) => {
        return {
          name: column.name,
          type: column.type,
        };
      });
      await db.readCSVIntoView({
        csvPath,
        viewName,
        columns: duckColumns,
        autoDetect: false,
        header: true,
      });
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
