import { GoogleSheetDatasetProxy } from "@/clients/google/GoogleSheetDatasetProxy/GoogleSheetDatasetProxy";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { GoogleSheetDatasetFetch } from "@/clients/google/GoogleSheetDatasetProxy/GoogleSheetDatasetProxy";

/**
 * Reads one tab's CSV into a relation.
 *
 * Injected rather than imported so this module stays free of DuckDB: the
 * browser passes an adapter over `DuckDbClient.loadCsv`, and a test can pass
 * one over a real DuckDB running in Node. `TRelation` is whatever that reader
 * produces, which in the browser is a load result carrying the Parquet Blob.
 */
export type GoogleSheetTabCsvReader<TRelation> = (
  params: Readonly<{ csvText: string }>,
) => Promise<TRelation>;

/** One acquired Sheets relation and the source version it was read at. */
export type AcquiredGoogleSheetRelation<TRelation> = {
  relation: TRelation;
  sourceVersion: SourceVersion;
};

/**
 * Acquires a saved Google Sheets dataset: download its stored tab as CSV
 * through the `google-sheets` edge function, then read it.
 *
 * The edge function resolves the stored tab by name with the same
 * `getStoredGoogleSheetTabCsv` the import and refresh use, and reads it with
 * the Google grant of the account that added the dataset. So whoever asks
 * reads the dataset's rows the same way, and no Google token is held here.
 *
 * @param params The dataset to acquire, and the reader and transport to do it
 * through.
 * @returns The reader's output and the Drive version the rows were read at.
 */
export async function acquireGoogleSheetRelation<TRelation>(
  params: Readonly<{
    datasetId: Dataset.Id;
    readCsv: GoogleSheetTabCsvReader<TRelation>;
    datasetFetch?: GoogleSheetDatasetFetch;
  }>,
): Promise<AcquiredGoogleSheetRelation<TRelation>> {
  const { csvText, sourceVersion } = await GoogleSheetDatasetProxy.fetchCsv({
    datasetId: params.datasetId,
    datasetFetch: params.datasetFetch,
  });

  const relation = await params.readCsv({ csvText });

  return { relation, sourceVersion };
}
