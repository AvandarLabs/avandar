import { useEffect, useMemo, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { Logger } from "@/utils/Logger";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

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
 * The columns to profile, in the dataset's order. A converted column's
 * values are read as stored, so it is profiled as the type its binding
 * replaced, not as the type its conversion gives it.
 */
function _toProfileColumns(
  columns: readonly DatasetColumn.T[],
  bindings: readonly DictionaryBinding.T[],
): ProfileColumn[] {
  const storedTypeByColumnId = new Map(
    bindings.flatMap((binding) => {
      return binding.mode === "convert" && binding.replacedDataType
        ? [[binding.datasetColumnId, binding.replacedDataType] as const]
        : [];
    }),
  );
  return [...columns]
    .sort((columnA, columnB) => {
      return columnA.columnIdx - columnB.columnIdx;
    })
    .map((column) => {
      const dataType = storedTypeByColumnId.get(column.id) ?? column.dataType;
      return { name: column.name, dataType };
    });
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
  const { dataset, columns, bindings } = options;
  const profileColumns = useMemo(() => {
    return columns ? _toProfileColumns(columns, bindings) : undefined;
  }, [columns, bindings]);
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
    let isCurrent = true;
    profileDatasetColumns({
      workspaceId: workspace.id,
      dataset,
      columns: profileColumns,
      readsRawValues: true,
    })
      .then((profiles) => {
        if (isCurrent) {
          setRead({ key, profiles: { status: "ready", profiles } });
        }
      })
      .catch((error: unknown) => {
        Logger.error(error, { devMsg: "Reading a dataset to apply failed" });
        if (isCurrent) {
          setRead({ key, profiles: { status: "failed" } });
        }
      });
    return () => {
      isCurrent = false;
    };
    // `key` stands for the dataset and the columns to profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, workspace.id]);
  return read.key === key ? read.profiles : { status: "reading" };
}
