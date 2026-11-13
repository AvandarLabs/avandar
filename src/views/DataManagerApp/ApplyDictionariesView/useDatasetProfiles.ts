import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { Logger } from "@/utils/Logger";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** Where reading a dataset's columns has got to. */
export type DatasetProfiles =
  | { status: "reading" }
  | { status: "ready"; profiles: readonly ColumnProfile.T[] }
  | { status: "failed" };

/** A read and the dataset and columns it is for. */
type TaggedRead = { key: string | undefined; profiles: DatasetProfiles };

/**
 * Reads one dataset's columns on this device: their values and row counts,
 * for matching them to dictionary entries. A read that finishes after the
 * dataset or its columns changed, or after the view closed, is dropped.
 */
export function useDatasetProfiles(
  options: Readonly<{
    dataset: Dataset.T | undefined;
    columns: readonly DatasetColumn.T[] | undefined;
  }>,
): DatasetProfiles {
  const workspace = useCurrentWorkspace();
  const { dataset, columns } = options;
  const key =
    dataset && columns
      ? `${dataset.id}:${columns
          .map((column) => {
            return `${column.id}=${column.name}`;
          })
          .join(",")}`
      : undefined;
  const [read, setRead] = useState<TaggedRead>({
    key: undefined,
    profiles: { status: "reading" },
  });
  useEffect(() => {
    if (!dataset || !columns || key === undefined) {
      return;
    }
    // Each read is tagged with its key, so a late reply cannot land.
    let isCurrent = true;
    profileDatasetColumns({
      workspaceId: workspace.id,
      dataset,
      columns: [...columns]
        .sort((columnA, columnB) => {
          return columnA.columnIdx - columnB.columnIdx;
        })
        .map((column) => {
          return { name: column.name, dataType: column.dataType };
        }),
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
    // `key` stands for the dataset and its columns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, workspace.id]);
  return read.key === key ? read.profiles : { status: "reading" };
}
