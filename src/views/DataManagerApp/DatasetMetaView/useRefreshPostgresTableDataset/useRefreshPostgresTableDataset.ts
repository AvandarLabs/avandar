import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

/**
 * Drops every cached copy of a Postgres table dataset's rows, so the next
 * query reads the table from the database again instead of waiting for the
 * cached rows to go stale, and marks the queries showing those rows stale so
 * they re-run.
 *
 * @returns The mutation tuple: a `refresh` callback and its pending flag.
 */
export function useRefreshPostgresTableDataset(): UseMutationResultTuple<
  void,
  { datasetId: Dataset.Id }
> {
  const { t } = useLingui();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ datasetId }: { datasetId: Dataset.Id }) => {
      await clearCachedDatasetRows({
        datasetId,
        userId: user!.id as User.Id,
        workspaceId: workspace.id,
      });
      await invalidateDatasetRowQueries(queryClient);
    },

    onSuccess: () => {
      notifySuccess({
        title: t`Refreshed from the database`,
        message: t`This dataset now reflects the current contents of the table.`,
      });
    },

    onError: (error) => {
      Logger.error(error, { devMsg: "Postgres table refresh failed" });
      notifyError({
        title: t`Could not refresh this dataset`,
        message: t`Try again. If it keeps failing, reload the page.`,
      });
    },
  });
}
