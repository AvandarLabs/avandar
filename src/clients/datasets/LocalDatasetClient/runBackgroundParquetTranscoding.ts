import { makeMap } from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ImportJobsManager } from "@/clients/datasets/ImportJobsManager";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/utils/notifications/notify";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  LocalDataset,
  LocalDatasetCsvParseOptions,
  LocalDatasetXlsxParseOptions,
} from "@/models/LocalDataset/LocalDataset.types";

/**
 * Reconciles the background parquet transcoding's authoritative column
 * schema against the Dataset's stored `detectedDataType`. For each name-matched
 * column whose detected type changed, we update the Supabase row + tally
 * for the warning toast.
 *
 * We intentionally only touch `detectedDataType` (not `dataType`) so user
 * overrides of the queryable type are preserved.
 */
async function _reconcileColumns(params: {
  datasetId: DatasetId;
  transcodeColumns: DuckDbColumnSchema[];
}): Promise<{ changedCount: number }> {
  // Lazy import to avoid a circular module load; these clients pull in
  // LocalDatasetClient transitively for cloud-fetch fallbacks.
  const { DatasetClient } =
    await import("@/clients/datasets/DatasetClient/DatasetClient");
  const { DatasetColumnClient } =
    await import("@/clients/datasets/DatasetColumnClient");

  let existingDataset;
  try {
    existingDataset = await DatasetClient.getOne({
      where: { id: { eq: params.datasetId } },
    });
  } catch {
    // Dataset hasn't been saved yet (user hasn't submitted the import form).
    // Nothing to reconcile against; Dataset creation will pick up the
    // transcoded schema directly from the load result.
    return { changedCount: 0 };
  }
  if (!existingDataset) {
    return { changedCount: 0 };
  }

  let existingColumns;
  try {
    existingColumns = await DatasetColumnClient.getAll({
      where: { dataset_id: { eq: params.datasetId } },
    });
  } catch {
    return { changedCount: 0 };
  }

  if (!existingColumns || existingColumns.length === 0) {
    return { changedCount: 0 };
  }

  const byName = makeMap(existingColumns, { key: "originalName" });

  let changedCount = 0;
  for (const detected of params.transcodeColumns) {
    const existing = byName.get(detected.column_name);
    if (!existing) {
      continue;
    }
    if (existing.detectedDataType !== detected.column_type) {
      try {
        await DatasetColumnClient.update({
          id: existing.id,
          data: { detectedDataType: detected.column_type },
        });
        changedCount += 1;
      } catch {
        // Best-effort: surface the discrepancy via the toast even if the
        // write fails.
        changedCount += 1;
      }
    }
  }

  return { changedCount };
}

/**
 * Builds the Dexie update applied once the parquet transcode succeeds.
 *
 * For a pinned row (a retained original, e.g. a PDF) `sourceBytes` must be
 * left untouched, which means the key has to be omitted from the update
 * object entirely: Dexie's `update()` treats an explicitly-passed
 * `undefined` value as an instruction to delete that key from the stored
 * row, so including `sourceBytes: undefined` here would destroy exactly the
 * bytes we're supposed to protect. For an unpinned row `sourceBytes` was
 * only ever a resume cache, so it's cleared now that the parquet has landed.
 */
export function makeTranscodeCompletionUpdateFromParquet(params: {
  parquetData: Blob;
  isSourcePinned: boolean | undefined;
}): Partial<LocalDataset> {
  const base = {
    parquetData: params.parquetData,
    parseStatus: "ready" as const,
    parseFailedReason: undefined,
  };

  if (params.isSourcePinned) {
    return base;
  }

  return {
    ...base,
    // Drop the cached source bytes now that the parquet has landed; we no
    // longer need them for resume.
    sourceBytes: undefined,
    lastSourceAccessedAt: undefined,
  };
}

/**
 * The background parquet transcoding engine. Updates the
 * LocalDataset row through its parsing → ready lifecycle, drives the
 * DuckDB transcode,
 * reconciles columns, and emits the success / failure toast. Always
 * swallows its own errors (they're surfaced via the toast +
 * `parseStatus="failed"`).
 *
 * Resolves with the final load result on success, or throws on failure.
 */
export async function runBackgroundParquetTranscoding(params: {
  datasetId: DatasetId;
  workspaceId: Workspace.Id;
  userId: UserId;
  source:
    | { kind: "csv"; file: File; options: LocalDatasetCsvParseOptions }
    | { kind: "xlsx"; file: File; options: LocalDatasetXlsxParseOptions };
}): Promise<DuckDbLoadCsvResult | DuckDbLoadXlsxResult> {
  const { datasetId } = params;
  const startedAt = Date.now();
  const sourceFileSize = params.source.file.size;
  const sourceFileName = params.source.file.name;

  await AvaDexie.DB.LocalDataset.update(datasetId, {
    parseStatus: "parsing",
    parseStartedAt: startedAt,
    parseFailedReason: undefined,
  });
  ImportJobsManager.startJob({ datasetId, sourceFileSize, startedAt });

  try {
    const result =
      params.source.kind === "csv"
        ? await DuckDbClient.loadCsv({
            tableName: datasetId,
            file: params.source.file,
            numRowsToSkip: params.source.options.numRowsToSkip,
            delimiter: params.source.options.delimiter,
          })
        : await DuckDbClient.loadXlsx({
            tableName: datasetId,
            file: params.source.file,
            sheet: params.source.options.sheet,
            hasHeader: params.source.options.hasHeader,
            rowsToSkip: params.source.options.rowsToSkip,
          });

    const currentRow = await AvaDexie.DB.LocalDataset.get(datasetId);
    await AvaDexie.DB.LocalDataset.update(
      datasetId,
      makeTranscodeCompletionUpdateFromParquet({
        parquetData: result.parquetData,
        isSourcePinned: currentRow?.isSourcePinned,
      }),
    );

    const { changedCount } = await _reconcileColumns({
      datasetId,
      transcodeColumns: result.columns,
    });

    ImportJobsManager.markSucceeded(datasetId);

    notifySuccess({
      title: i18n._(msg`Dataset ready`),
      message: i18n._(
        msg`"${sourceFileName}" finished processing and is ready to use.`,
      ),
    });
    if (changedCount > 0) {
      notifyWarning({
        title: i18n._(msg`Column types updated`),
        message:
          changedCount === 1
            ? i18n._(
                msg`Detected column types for 1 column in "${sourceFileName}" differed from the import preview and have been overwritten with the actual values.`,
              )
            : i18n._(
                msg`Detected column types for ${changedCount} columns in "${sourceFileName}" differed from the import preview and have been overwritten with the actual values.`,
              ),
      });
    }

    // Hold the terminal job entry for a tick so the upload coordinator
    // (which awaits `waitForCompletion`) can observe success before the
    // entry disappears.
    setTimeout(() => {
      ImportJobsManager.clearJob(datasetId);
    }, 2000);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await AvaDexie.DB.LocalDataset.update(datasetId, {
      parseStatus: "failed",
      parseFailedReason: message,
    });
    ImportJobsManager.markFailed(datasetId, message);
    notifyError({
      title: i18n._(msg`Dataset failed to process`),
      message: i18n._(msg`"${sourceFileName}" could not be parsed: ${message}`),
    });
    setTimeout(() => {
      ImportJobsManager.clearJob(datasetId);
    }, 2000);
    throw err;
  }
}
