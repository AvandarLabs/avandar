import { useMutation } from "@avandar/query-hooks";
import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { APIClient } from "@/clients/APIClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { getStoredGoogleSheetTabCsv } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import { clearGoogleSheetFreshness } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";
import { clearCachedDatasetRows } from "@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

/** What one refresh needs. Every field comes from the caller's own state. */
export type RefreshGoogleSheetDatasetParams = {
  datasetId: Dataset.Id;

  /**
   * The dataset's Sheets source row, already loaded on the dataset page.
   * Do not re-read it here: an extra query would not match the rest of this
   * path.
   */
  sourceDataset: Pick<
    GoogleSheetsDataset.T,
    "googleDocumentId" | "googleAccountId" | "sheetName"
  >;
};

async function _getGoogleAccessToken(): Promise<string> {
  const { tokens } = await APIClient.get({ route: "google-auth/tokens" });
  // TODO(jpsyx): take the token for `sourceDataset.googleAccountId` once
  // multiple Google accounts are supported. Every other consumer in the repo
  // takes `tokens[0]`, so this one does too rather than inventing a
  // different rule.
  const accessToken = tokens[0]?.access_token;
  if (accessToken === undefined) {
    throw new Error("No Google token is available for this user");
  }
  return accessToken;
}

/** Downloads the dataset's stored tab and imports it as the local copy. */
async function _reimportGoogleSheetTab(
  options: Readonly<
    RefreshGoogleSheetDatasetParams & {
      userId: User.Id;
      workspaceId: Workspace.Id;
    }
  >,
): Promise<void> {
  const { datasetId, sourceDataset, userId, workspaceId } = options;
  const accessToken = await _getGoogleAccessToken();

  // The same download acquisition and import use, so a refreshed dataset is
  // read exactly the way the original import read it. It resolves the stored
  // tab name, and fails by name when a rename means it no longer matches,
  // rather than quietly returning another tab's rows.
  const { csvText } = await getStoredGoogleSheetTabCsv({
    fileId: sourceDataset.googleDocumentId,
    sheetName: sourceDataset.sheetName,
    accessToken,
  });

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
