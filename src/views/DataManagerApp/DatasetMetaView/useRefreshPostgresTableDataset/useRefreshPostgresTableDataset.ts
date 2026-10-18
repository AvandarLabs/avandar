import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { RAW_SQL_KEY_MARKER } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

/**
 * Drops every cached copy of a Postgres table dataset's rows, so the next
 * query reads the table from the database again instead of waiting for the
 * cached rows to go stale, and marks open data queries stale so they re-run.
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
      await DexieRelationCache.evict(
        [{ kind: "dataset", id: datasetId }],
        makePrincipalKeyFromWorkspaceSession({
          workspaceId: workspace.id,
          userId: user!.id as User.Id,
        }),
      );
      // Drops the table loaded into this tab's DuckDB, so the next query
      // misses both caches and acquires the rows again.
      await LocalDatasetClient.dropLocalDataset({ datasetId });
      // A data query's key names its SQL, not the datasets the SQL reads, so
      // every data query is marked stale. Only the ones on screen re-run.
      await queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[2] === RAW_SQL_KEY_MARKER;
        },
      });
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
