import type {
  CsvParseResolvedOptions,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type {
  DuckDbColumnSchema,
  DuckDbCsvSniffResult,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbRunRawQuery } from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

import { buildReadCsvArgList } from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";
import {
  buildDuckDbCsvSniffResultFromResolved,
  buildDuckDbCsvSniffResultFromSniffRow,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvSniffResult";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";

/** The columns and first rows read from a CSV without transcoding it. */
export type CsvPreviewData = {
  columns: DuckDbColumnSchema[];
  previewRows: UnknownRow[];
  readCsvArgs: string;
};

type CsvPreviewResultOptions = {
  parseOptions: CsvParseResolvedOptions;
  preview: CsvPreviewData;
  sniffRow: DuckDbSniffCsvRow | undefined;
  stagingFile: string;
};

/** Reads the column schema and the first rows of a registered CSV. */
export async function getCsvPreviewData(
  options: Readonly<{
    runRawQuery: DuckDbRunRawQuery;
    conn: duckdb.AsyncDuckDBConnection;
    stagingFile: string;
    parseOptions: CsvParseResolvedOptions;
    maxPreviewRows: number;
  }>,
): Promise<CsvPreviewData> {
  const readCsvArgs = buildReadCsvArgList({
    parseOptions: options.parseOptions,
    mode: "preview",
  }).join(", ");
  const queryOptions = {
    conn: options.conn,
    params: { file: options.stagingFile },
    [TRUSTED_INTERNAL_SQL]: true as const,
  };
  const columnsResult = await options.runRawQuery<DuckDbColumnSchema>(
    `DESCRIBE SELECT * FROM read_csv('$file$', ${readCsvArgs})`,
    queryOptions,
  );
  // Both reads share one DuckDB connection, which serializes queries anyway,
  // so running them concurrently would buy nothing and interleave their state.
  // react-doctor-disable-next-line
  const previewResult = await options.runRawQuery<UnknownRow>(
    `SELECT * FROM read_csv('$file$', ${readCsvArgs}) LIMIT ${options.maxPreviewRows}`,
    queryOptions,
  );
  return {
    columns: columnsResult.data,
    previewRows: previewResult.data,
    readCsvArgs,
  };
}

function _getCsvPreviewSniff(
  options: Readonly<CsvPreviewResultOptions>,
): DuckDbCsvSniffResult {
  return options.sniffRow
    ? buildDuckDbCsvSniffResultFromSniffRow({
        tableName: options.stagingFile,
        sniffRow: options.sniffRow,
        parseOptions: options.parseOptions,
      })
    : buildDuckDbCsvSniffResultFromResolved({
        tableName: options.stagingFile,
        parseOptions: options.parseOptions,
        columns: options.preview.columns.map((column) => {
          return {
            name: column.column_name,
            type: column.column_type,
          };
        }),
        userArguments: options.preview.readCsvArgs,
      });
}

/** Assembles the sniff, columns, and preview rows returned by `sniffCsv`. */
export function getCsvPreviewResult(
  options: Readonly<CsvPreviewResultOptions>,
): {
  csvSniff: DuckDbCsvSniffResult;
  columns: DuckDbColumnSchema[];
  previewRows: UnknownRow[];
} {
  return {
    csvSniff: _getCsvPreviewSniff(options),
    columns: options.preview.columns,
    previewRows: options.preview.previewRows,
  };
}
