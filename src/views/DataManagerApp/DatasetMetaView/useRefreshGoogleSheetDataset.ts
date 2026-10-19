import { useMutation } from "@avandar/query-hooks";
import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { clearGoogleSheetFreshness } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { GoogleSheetDatasetProxy } from "@/clients/google/GoogleSheetDatasetProxy/GoogleSheetDatasetProxy";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

/** What one refresh needs. */
export type RefreshGoogleSheetDatasetParams = {
  datasetId: Dataset.Id;
};

/** Downloads the dataset's stored tab and imports it as the local copy. */
async function _reimportGoogleSheetTab(
  options: Readonly<
    RefreshGoogleSheetDatasetParams & {
      userId: User.Id;
      workspaceId: Workspace.Id;
    }
  >,
): Promise<void> {
  const { datasetId, userId, workspaceId } = options;

  // The same download acquisition uses, so a refreshed dataset is read the
  // way every other read of it is: by the edge function, with the Google
  // grant of the account that added it, resolving the stored tab by name and
  // failing by name when a rename means it no longer matches. Anyone who may
  // see the dataset can refresh it, not only the person who added it.
  const { csvText } = await GoogleSheetDatasetProxy.fetchCsv({ datasetId });

  // Re-imported the same way the dataset was first imported: one tab, as
  // CSV. Refreshing through a different reader would retype the columns.
  await LocalDatasetClient.startCsvImport({
    datasetId,
    userId,
    workspaceId,
    file: new File([csvText], `${datasetId}.csv`, {
      type: MIMEType.TEXT_CSV,
    }),
    parseOptions: {},
  });
}

/**
 * Re-acquires a Google Sheets dataset from Drive, replacing cached bytes so
 * the next query cannot serve the previous export, and marks the queries
 * showing those rows stale so they re-run.
 *
 * @returns The mutation tuple: a `refresh` callback and its pending flag.
 */
export function useRefreshGoogleSheetDataset(): UseMutationResultTuple<
  void,
  RefreshGoogleSheetDatasetParams
> {
  const { t, i18n } = useLingui();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RefreshGoogleSheetDatasetParams) => {
      const userId = user!.id as User.Id;
      clearGoogleSheetFreshness({ datasetId: params.datasetId });
      await clearCachedDatasetRows({
        datasetId: params.datasetId,
        userId,
        workspaceId: workspace.id,
      });
      await _reimportGoogleSheetTab({
        ...params,
        userId,
        workspaceId: workspace.id,
      });
      await invalidateDatasetRowQueries(queryClient);
    },

    onSuccess: () => {
      notifySuccess({
        title: t`Refreshed from Google Sheets`,
        message: t`This dataset now reflects the current contents of the sheet.`,
      });
    },

    onError: (error) => {
      Logger.error(error, { devMsg: "Google Sheet refresh failed" });
      notifyError(getGoogleSheetImportErrorCopy({ error, i18n }));
    },
  });
}
