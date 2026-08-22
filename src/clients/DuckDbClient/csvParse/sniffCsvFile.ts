import { uuid } from "$/lib/uuid";
import { createCsvParseOptionsFromUserHints } from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import {
  getCsvPreviewData,
  getCsvPreviewResult,
} from "@/clients/DuckDbClient/csvParse/csvPreview";
import {
  getCsvParseUserHints,
  sniffCsvWithDuckDb,
} from "@/clients/DuckDbClient/csvParse/csvSniff";
import { registerCsvFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import type { CsvDialectHints } from "@/clients/DuckDbClient/csvParse/csvSniff";
import type {
  DuckDbColumnSchema,
  DuckDbCsvSniffResult,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

/** Options for `DuckDbClient.sniffCsv`. */
export type SniffCsvOptions = CsvDialectHints & {
  file: File;
  maxPreviewRows: number;
};

/**
 * Inspects a CSV without transcoding it, returning the detected dialect, the
 * inferred column schema, and the first `maxPreviewRows` rows.
 */
export async function sniffCsvFile(
  options: Readonly<SniffCsvOptions & { client: DuckDbClientOperations }>,
): Promise<{
  csvSniff: DuckDbCsvSniffResult;
  columns: DuckDbColumnSchema[];
  previewRows: UnknownRow[];
}> {
  const { client } = options;
  const userHints = getCsvParseUserHints(options);
  const stagingFile = `sniff__${uuid()}.csv`;
  const conn = await client.connect();
  try {
    await client.runRawQuery("DROP TABLE IF EXISTS reject_scans", { conn });
    await client.runRawQuery("DROP TABLE IF EXISTS reject_errors", { conn });

    const db = await client.getDb();
    await registerCsvFile({ db, tableName: stagingFile, file: options.file });

    const baseParseOptions = createCsvParseOptionsFromUserHints(userHints);
    const { parseOptions, sniffRow } = await sniffCsvWithDuckDb({
      runRawQuery: client.runRawQuery,
      conn,
      stagingFile,
      userHints,
      parseOptions: baseParseOptions,
      file: options.file,
    });

    const preview = await getCsvPreviewData({
      runRawQuery: client.runRawQuery,
      conn,
      stagingFile,
      parseOptions,
      maxPreviewRows: options.maxPreviewRows,
    });
    await db.dropFile(stagingFile);
    return getCsvPreviewResult({
      stagingFile,
      sniffRow,
      parseOptions,
      preview,
    });
  } finally {
    await client.closeConnection(conn);
  }
}
