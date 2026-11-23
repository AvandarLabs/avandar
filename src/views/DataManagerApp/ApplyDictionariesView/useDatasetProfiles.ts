import { useEffect, useMemo, useState } from "react";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { Logger } from "@/utils/Logger";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Where reading a dataset's columns has got to. */
export type DatasetProfiles =
  | { status: "reading" }
  | { status: "ready"; profiles: readonly ColumnProfile.T[] }
  | { status: "failed" };

/** A read and the dataset and columns it is for. */
type TaggedRead = { key: string | undefined; profiles: DatasetProfiles };

/** A column to profile: its name and the type its values are stored as. */
type ProfileColumn = { name: string; dataType: DatasetColumn.T["dataType"] };

/**
 * The type a column's values are stored as. A converted column is read as
 * stored, so it takes the type its binding replaced or, without one, the
 * type detected in the data, not the type its conversion gives it.
 */
function _getStoredDataType(
  column: DatasetColumn.T,
  convertBinding: DictionaryBinding.T | undefined,
): DatasetColumn.T["dataType"] {
  if (!convertBinding) {
    return column.dataType;
  }
  return (
    convertBinding.replacedDataType ??
    DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType)
  );
}

/** The columns to profile, in the dataset's order, by their stored types. */
function _toProfileColumns(
  columns: readonly DatasetColumn.T[],
  bindings: readonly DictionaryBinding.T[],
): ProfileColumn[] {
  const convertBindingByColumnId = new Map(
    bindings.flatMap((binding) => {
      return binding.mode === "convert"
        ? [[binding.datasetColumnId, binding] as const]
        : [];
    }),
  );
  return [...columns]
    .sort((columnA, columnB) => {
      return columnA.columnIdx - columnB.columnIdx;
    })
    .map((column) => {
      return {
        name: column.name,
        dataType: _getStoredDataType(
          column,
          convertBindingByColumnId.get(column.id),
        ),
      };
    });
}

/** The columns to profile, kept while the columns and bindings are. */
function useProfileColumns(
  columns: readonly DatasetColumn.T[] | undefined,
  bindings: readonly DictionaryBinding.T[],
): ProfileColumn[] | undefined {
  return useMemo(() => {
    return columns ? _toProfileColumns(columns, bindings) : undefined;
  }, [columns, bindings]);
}

/** The tag of a read: the dataset and each column's name and stored type. */
function _buildReadKey(
  dataset: Dataset.T | undefined,
  profileColumns: readonly ProfileColumn[] | undefined,
): string | undefined {
  if (!dataset || !profileColumns) {
    return undefined;
  }
  const columnKeys = profileColumns.map((column) => {
    return `${column.name}:${column.dataType}`;
  });
  return `${dataset.id}:${columnKeys.join(",")}`;
}

/**
 * Profiles the columns as stored and reports the result, unless the
 * returned cancel ran first.
 */
function _startProfileRead(
  options: Readonly<{
    workspaceId: Workspace.Id;
    dataset: Dataset.T;
    profileColumns: readonly ProfileColumn[];
    onRead: (profiles: DatasetProfiles) => void;
  }>,
): () => void {
  let isCurrent = true;
  profileDatasetColumns({
    workspaceId: options.workspaceId,
    dataset: options.dataset,
    columns: options.profileColumns,
    readsRawValues: true,
  })
    .then((profiles) => {
      if (isCurrent) {
        options.onRead({ status: "ready", profiles });
      }
    })
    .catch((error: unknown) => {
      Logger.error(error, { devMsg: "Reading a dataset to apply failed" });
      if (isCurrent) {
        options.onRead({ status: "failed" });
      }
    });
  return () => {
    isCurrent = false;
  };
}

/**
 * Reads one dataset's columns on this device: their values and row counts,
 * for matching them to dictionary entries. A read that finishes after the
 * dataset or its columns changed, or after the view closed, is dropped.
 * It reads the values as stored, so a converted dataset is matched on its
 * codes, not on the labels its conversions show.
 */
export function useDatasetProfiles(
  options: Readonly<{
    dataset: Dataset.T | undefined;
    columns: readonly DatasetColumn.T[] | undefined;
    /** The dataset's bindings: how its converted columns are stored. */
    bindings: readonly DictionaryBinding.T[];
  }>,
): DatasetProfiles {
  const workspace = useCurrentWorkspace();
  const { dataset } = options;
  const profileColumns = useProfileColumns(options.columns, options.bindings);
  const key = _buildReadKey(dataset, profileColumns);
  const [read, setRead] = useState<TaggedRead>({
    key: undefined,
    profiles: { status: "reading" },
  });
  useEffect(() => {
    if (!dataset || !profileColumns || key === undefined) {
      return;
    }
    // Each read is tagged with its key, so a late reply cannot land.
    return _startProfileRead({
      workspaceId: workspace.id,
      dataset,
      profileColumns,
      onRead: (profiles) => {
        setRead({ key, profiles });
      },
    });
    // `key` stands for the dataset and the columns to profile.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [key, workspace.id]);
  return read.key === key ? read.profiles : { status: "reading" };
}
