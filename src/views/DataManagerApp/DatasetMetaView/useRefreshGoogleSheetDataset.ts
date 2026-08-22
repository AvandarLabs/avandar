import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

import { useMutation } from "@avandar/query-hooks";
import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";

import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { APIClient } from "@/clients/APIClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { getGoogleSheetXlsxExport } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import { clearGoogleSheetFreshness } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";

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

      const { xlsxBytes } = await getGoogleSheetXlsxExport({
        fileId: sourceDataset.googleDocumentId,
        accessToken,
      });

      await LocalDatasetClient.startXlsxImport({
        datasetId,
        userId: user!.id as User.Id,
        workspaceId: workspace.id,
        file: new File([new Blob([xlsxBytes])], `${datasetId}.xlsx`, {
          type: MIMEType.APPLICATION_OPENXML_EXCEL,
        }),
        // `null` means the workbook's first tab, which is `read_xlsx`'s own
        // default and what a missing stored tab name means today.
        parseOptions: { sheet: sourceDataset.sheetName ?? undefined },
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
