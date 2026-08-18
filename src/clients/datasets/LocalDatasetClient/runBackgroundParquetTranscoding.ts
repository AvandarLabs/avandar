import { isDefined, makeMap } from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ImportJobsManager } from "@/clients/datasets/ImportJobsManager";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/utils/notifications/notify";
import type {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  LocalDatasetCsvParseOptions,
  LocalDatasetXlsxParseOptions,
} from "@/models/LocalDataset/LocalDataset.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * What to write for a column whose detected type the transcode revised.
 *
 * The user's own choice of `dataType` wins; otherwise it follows the corrected
 * detected type.
 */
function _getReconciledColumnUpdate(
  options: Readonly<{
    existingColumn: Pick<DatasetColumn.T, "dataType" | "isDataTypeUserSet">;
    detectedDataType: DuckDbColumnSchema["column_type"];
  }>,
): Pick<DatasetColumn.T, "dataType" | "detectedDataType"> {
  const { existingColumn, detectedDataType } = options;
  return {
    detectedDataType,
    dataType:
      existingColumn.isDataTypeUserSet ?
        existingColumn.dataType
      : DuckDbDataTypeUtils.toAvaDataType(detectedDataType),
  };
}

/**
 * Reconciles the background parquet transcode's column schema against the
 * dataset's stored `detectedDataType`.
 *
 * A column the user typed themselves keeps its `dataType`; only its
 * `detectedDataType` is corrected. For every other column `dataType` follows
 * the corrected `detectedDataType`. Both fields must move together: correcting
 * `detectedDataType` alone flattens an XLSX import to text, because its sniff
 * reports every column as `VARCHAR`.
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

  const staleColumns = params.transcodeColumns
    .map((detected) => {
      const existingColumn = byName.get(detected.column_name);
      return (
          isDefined(existingColumn) &&
            existingColumn.detectedDataType !== detected.column_type
        ) ?
          { existingColumn, detectedDataType: detected.column_type }
        : undefined;
    })
    .filter(isDefined);

  // One row per column, so the writes are independent and go out together.
  await Promise.all(
    staleColumns.map(async (staleColumn) => {
      try {
        await DatasetColumnClient.update({
          id: staleColumn.existingColumn.id,
          data: _getReconciledColumnUpdate(staleColumn),
        });
      } catch {
        // Best-effort: the toast reports the discrepancy either way, which is
        // why a failed write still counts as changed.
      }
    }),
  );

  return { changedCount: staleColumns.length };
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
      params.source.kind === "csv" ?
        await DuckDbClient.loadCsv({
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
        });

    await AvaDexie.DB.LocalDataset.update(datasetId, {
      parquetData: result.parquetData,
      parseStatus: "ready",
      parseFailedReason: undefined,
      // Drop the cached source bytes now that the parquet has landed;
      // we no longer need them for resume.
      sourceBytes: undefined,
      lastSourceAccessedAt: undefined,
    });

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
          changedCount === 1 ?
            i18n._(
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
