import { useMutation } from "@avandar/query-hooks";
import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { APIClient } from "@/clients/APIClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import {
  getGoogleSheetTabCsvExport,
  getGoogleSheetTabs,
} from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import { clearGoogleSheetFreshness } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";
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

async function _evictWorkspaceRelationCache(args: {
  datasetId: Dataset.Id;
  userId: User.Id;
  workspaceId: Workspace.Id;
}): Promise<void> {
  await DexieRelationCache.evict(
    [{ kind: "dataset", id: args.datasetId }],
    makePrincipalKeyFromWorkspaceSession({
      workspaceId: args.workspaceId,
      userId: args.userId,
    }),
  );
}

/**
 * Re-acquires a Google Sheets dataset from Drive, replacing cached bytes so
 * the next query cannot serve the previous export.
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

  return useMutation({
    mutationFn: async (params: RefreshGoogleSheetDatasetParams) => {
      const { datasetId, sourceDataset } = params;

      clearGoogleSheetFreshness({ datasetId });
      await _evictWorkspaceRelationCache({
        datasetId,
        userId: user!.id as User.Id,
        workspaceId: workspace.id,
      });
      await LocalDatasetClient.dropLocalDataset({ datasetId });

      const { tokens } = await APIClient.get({
        route: "google-auth/tokens",
      });
      // TODO(jpsyx): take the token for `sourceDataset.googleAccountId` once
      // multiple Google accounts are supported. Every other consumer in the
      // repo takes `tokens[0]`, so this one does too rather than inventing a
      // different rule.
      const accessToken = tokens[0]?.access_token;
      if (accessToken === undefined) {
        throw new Error("No Google token is available for this user");
      }

      // The tab is stored by name, so the gid it exports under is looked up
      // here rather than remembered. A renamed tab therefore fails to refresh,
      // which is the same thing that happened when the name was handed to
      // `read_xlsx`, and it fails loudly instead of silently importing another
      // tab's rows.
      const tabs = await getGoogleSheetTabs({
        fileId: sourceDataset.googleDocumentId,
        accessToken,
      });
      const tab =
        sourceDataset.sheetName === null
          ? tabs[0]
          : tabs.find((candidate) => {
              return candidate.title === sourceDataset.sheetName;
            });
      if (!tab) {
        throw new Error(
          `The tab "${sourceDataset.sheetName}" is no longer in this ` +
            "spreadsheet. It may have been renamed or deleted.",
        );
      }

      const { csvText } = await getGoogleSheetTabCsvExport({
        fileId: sourceDataset.googleDocumentId,
        sheetId: tab.sheetId,
        accessToken,
      });

      // Re-imported the same way the dataset was first imported: one tab, as
      // CSV. Refreshing through a different reader would retype the columns.
      await LocalDatasetClient.startCsvImport({
        datasetId,
        userId: user!.id as User.Id,
        workspaceId: workspace.id,
        file: new File([csvText], `${datasetId}.csv`, {
          type: MIMEType.TEXT_CSV,
        }),
        parseOptions: {},
      });
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
