import { getIsOnline } from "@avandar/browser-utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { uuid } from "$/lib/uuid";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { clearCombinedDatasetCaches } from "@/lib/crosswalks/clearCombinedDatasetCaches/clearCombinedDatasetCaches";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { useCrosswalkErrorMessage } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkErrorMessage/useCrosswalkErrorMessage";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { CompileCrosswalkResult } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";

/** One save of the combined dataset: what was compiled, and what to call it. */
export type SaveCombinedOptions = {
  crosswalkId: Crosswalk.Id;
  /** The crosswalk's combined dataset, or undefined to create one. */
  outputDatasetId: Dataset.Id | undefined;
  result: Extract<CompileCrosswalkResult, { status: "ready" }>;
  datasetName: string;
};

function _toCombinePayload(
  options: SaveCombinedOptions,
  datasetId: Dataset.Id,
): Crosswalk.CombinePayload {
  const { result } = options;
  return {
    crosswalkId: options.crosswalkId,
    datasetId,
    datasetName: options.datasetName.trim(),
    rawSql: result.sql,
    columns: result.columns,
    bindings: result.bindings,
    compiledCodeLists: result.compiledCodeLists,
  };
}

/**
 * What a saved combined dataset does next: drop every cached copy of its
 * rows and the queries that show it, say it was created or updated, and
 * open it, unless the user already left the view. A failure to clear the
 * caches is logged; the save itself already succeeded.
 */
function useAfterCombine(): (
  datasetId: Dataset.Id,
  options: SaveCombinedOptions,
) => Promise<void> {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const isMountedRef = useIsMounted();
  return async (datasetId, options) => {
    const datasetName = options.datasetName.trim();
    if (user) {
      await clearCombinedDatasetCaches({
        queryClient,
        datasetId,
        userId: user.id as User.Id,
        workspaceId: workspace.id,
      }).catch((error: unknown) => {
        Logger.error(error, {
          devMsg: "Clearing a combined dataset's caches failed",
        });
      });
    }
    notifySuccess(
      options.outputDatasetId
        ? t`Updated ${datasetName}.`
        : t`Created ${datasetName}.`,
    );
    if (isMountedRef.current) {
      navigate(
        AppLinks.dataManagerDatasetView({
          workspaceSlug: workspace.slug,
          datasetId,
          datasetName,
        }),
      );
    }
  };
}

/**
 * Creates or updates a crosswalk's combined dataset from a compile result
 * in one call, then clears its caches, says so, and opens it. A second
 * press while one is in flight is ignored, a save while offline says so and
 * sends nothing, and a refusal is explained from its hint. Resolves to the
 * dataset's id, or undefined when nothing was saved.
 */
export function useSaveCombinedDataset(): [
  save: (options: SaveCombinedOptions) => Promise<Dataset.Id | undefined>,
  isSaving: boolean,
] {
  const { t } = useLingui();
  const isSavingRef = useRef(false);
  const toErrorMessage = useCrosswalkErrorMessage();
  const afterCombine = useAfterCombine();
  const [, isSaving, mutation] = CrosswalkClient.useSaveCombinedDataset({
    onError: (error: unknown) => {
      Logger.error(error, { devMsg: "Saving a combined dataset failed" });
      notifyError(toErrorMessage(error));
    },
  });
  const save = async (
    options: SaveCombinedOptions,
  ): Promise<Dataset.Id | undefined> => {
    if (isSavingRef.current) {
      return undefined;
    }
    if (!getIsOnline()) {
      notifyError(t`You're offline. Reconnect to save this.`);
      return undefined;
    }
    isSavingRef.current = true;
    try {
      const datasetId = await mutation.mutateAsync(
        _toCombinePayload(
          options,
          options.outputDatasetId ?? uuid<Dataset.Id>(),
        ),
      );
      await afterCombine(datasetId, options);
      return datasetId;
    } catch {
      // The mutation's onError has logged it and said why.
      return undefined;
    } finally {
      isSavingRef.current = false;
    }
  };
  return [save, isSaving];
}
