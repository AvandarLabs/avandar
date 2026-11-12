import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { notifyError } from "@/utils/notifications/notify";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ProfiledColumn } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";

/** One dataset to read, with its columns. */
export type ReadableDataset = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
};

function _toProfiledColumns(
  columns: readonly DatasetColumn.T[],
): ProfiledColumn[] {
  return [...columns]
    .sort((columnA, columnB) => {
      return columnA.columnIdx - columnB.columnIdx;
    })
    .map((column) => {
      return { name: column.name, dataType: column.dataType };
    });
}

/**
 * Reads datasets on this device, one after another, and groups their
 * columns into a proposal. The create flow calls it when the user reads the
 * datasets they picked, and right away when the flow opens from a
 * dataset's menu. `onRead` also gets the datasets that were read, so a read
 * that finished late can be told from the current one.
 */
export function useReadDatasets(
  options: Readonly<{
    onRead: (
      proposal: DictionaryProposal.T,
      datasets: readonly ReadableDataset[],
    ) => void;
  }>,
): [read: (datasets: readonly ReadableDataset[]) => void, isReading: boolean] {
  const workspace = useCurrentWorkspace();
  const { t } = useLingui();
  const [read, isReading] = useMutation({
    mutationFn: async (datasets: readonly ReadableDataset[]) => {
      // One dataset at a time: reading one loads it into DuckDB.
      const profiles = await datasets.reduce(
        async (previous, { dataset, columns }) => {
          const done = await previous;
          const profiled = await profileDatasetColumns({
            workspaceId: workspace.id,
            dataset,
            columns: _toProfiledColumns(columns),
          });
          return [...done, ...profiled];
        },
        Promise.resolve<ColumnProfile.T[]>([]),
      );
      return DictionaryProposal.fromColumnProfiles(profiles);
    },
    onSuccess: (proposal, datasets) => {
      options.onRead(proposal, datasets);
    },
    onError: () => {
      notifyError(
        t`Avandar could not read these datasets. Try again, or pick fewer datasets.`,
      );
    },
  });
  return [read, isReading];
}
