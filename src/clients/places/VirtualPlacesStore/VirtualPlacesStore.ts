import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { uuid } from "$/lib/uuid";
import { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers";
import { createServerApiClient } from "$/ServerApiClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { buildPlacesReadSql } from "@/clients/places/buildPlacesReadSql";
import { buildPlacesValuesSql } from "@/clients/places/buildPlacesValuesSql/buildPlacesValuesSql";
import { parsePlaceRowsFromQueryRows } from "@/clients/places/parsePlaceRowsFromQueryRows/parsePlaceRowsFromQueryRows";
import { PLACES_DATASET_COLUMNS } from "@/clients/places/places.constants";
import { PlacesNotEditableError } from "@/clients/places/PlacesNotEditableError";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { QueryErrorKind } from "@/lib/sql/QueryErrorKind/QueryErrorKind";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DatasetDBRead } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { PlacesStore } from "@/clients/places/places.types";

const serverApi = createServerApiClient();

/**
 * The dataset's virtual row, read fresh so an edit never starts from stale
 * SQL.
 */
async function _getPlacesVirtualDataset(
  datasetId: Dataset.Id,
): Promise<VirtualDataset.T> {
  const [virtualDataset] = await VirtualDatasetClient.getAll(
    where("dataset_id", "eq", datasetId),
  );
  if (!virtualDataset?.isPlaces) {
    throw new PlacesNotEditableError({
      datasetId,
      reason: "not_places_dataset",
    });
  }
  return virtualDataset;
}

/**
 * Whether a failed read means the stored SQL no longer has the places columns
 * (a missing column, or a column whose type the read SQL cannot format).
 */
function _isMissingPlacesColumnsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const { kind } = QueryErrorKind.fromMessage(message);
  return kind === "missing_column" || kind === "mismatched_values";
}

/**
 * Runs the read SQL, turning a missing-places-columns failure into a typed
 * error.
 */
async function _runPlacesReadQuery(
  options: Readonly<{
    workspaceId: Workspace.Id;
    datasetId: Dataset.Id;
    storedSql: string;
  }>,
): Promise<readonly UnknownRow[]> {
  try {
    const result = await WorkspaceQuerySession.runQuery({
      workspaceId: options.workspaceId,
      rawSql: buildPlacesReadSql(options.storedSql),
    });
    return result.data;
  } catch (error) {
    if (_isMissingPlacesColumnsError(error)) {
      throw new PlacesNotEditableError({
        datasetId: options.datasetId,
        reason: "rows_not_places",
        cause: error,
      });
    }
    throw error;
  }
}

const _createPlacesDataset: PlacesStore["createPlacesDataset"] = async (
  options,
) => {
  const dataset = await serverApi.rpc<DatasetDBRead>(
    "rpc_datasets__add_places_dataset",
    {
      p_dataset_id: uuid<Dataset.Id>(),
      p_workspace_id: options.workspaceId,
      p_dataset_name: options.datasetName,
      p_dataset_description: "",
      p_columns: PLACES_DATASET_COLUMNS.map((column) => {
        return { ...column, description: column.description ?? null };
      }),
      p_raw_sql: buildPlacesValuesSql([]),
    },
  );
  return DatasetParsers.fromDBReadToModelRead(dataset);
};

const _readPlaces: PlacesStore["readPlaces"] = async (options) => {
  const virtualDataset = await _getPlacesVirtualDataset(options.datasetId);
  const rows = await _runPlacesReadQuery({
    workspaceId: options.workspaceId,
    datasetId: options.datasetId,
    storedSql: virtualDataset.rawSql,
  });
  try {
    return parsePlaceRowsFromQueryRows(rows);
  } catch (error) {
    throw new PlacesNotEditableError({
      datasetId: options.datasetId,
      reason: "rows_not_places",
      cause: error,
    });
  }
};

const _writePlaces: PlacesStore["writePlaces"] = async (options) => {
  const virtualDataset = await _getPlacesVirtualDataset(options.datasetId);
  await VirtualDatasetClient.update({
    id: virtualDataset.id,
    data: { rawSql: buildPlacesValuesSql(options.rows) },
  });
};

function usePlacesDatasetIds(
  workspaceId: Workspace.Id,
): ReadonlySet<Dataset.Id> {
  const [virtualDatasets] = VirtualDatasetClient.useGetAll({
    where: { workspace_id: { eq: workspaceId }, is_places: { eq: true } },
  });
  return useMemo(() => {
    return new Set((virtualDatasets ?? []).map(prop("datasetId")));
  }, [virtualDatasets]);
}

/**
 * A places dataset stored as a virtual dataset whose `raw_sql` is a `VALUES`
 * list. Every write replaces the whole list; callers drop cached copies of
 * the rows afterwards (see `refreshPlacesDatasetCaches`). Reads and writes
 * throw `PlacesNotEditableError` when the dataset cannot be edited as places.
 */
export const VirtualPlacesStore: PlacesStore = {
  createPlacesDataset: _createPlacesDataset,
  readPlaces: _readPlaces,
  writePlaces: _writePlaces,
  usePlacesDatasetIds,
};
