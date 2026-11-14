import { getIsOnline } from "@avandar/browser-utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
 * Sends the payload. A refused save resolves to undefined: the mutation's
 * `onError` has logged it and said why.
 */
async function _send(
  mutateAsync: (payload: Crosswalk.CombinePayload) => Promise<Dataset.Id>,
  options: SaveCombinedOptions,
): Promise<Dataset.Id | undefined> {
  try {
    return await mutateAsync(
      _toCombinePayload(options, options.outputDatasetId ?? uuid<Dataset.Id>()),
    );
  } catch {
    return undefined;
  }
}

/**
 * Drops every cached copy of the combined dataset's rows for the signed-in
 * user. It throws when there is no signed-in user, since their caches are
 * the ones to clear, and when clearing fails.
 */
function useClearCaches(): (datasetId: Dataset.Id) => Promise<void> {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  return async (datasetId) => {
    if (!user) {
      throw new Error("No signed-in user to clear the cached rows of");
    }
    await clearCombinedDatasetCaches({
      queryClient,
      datasetId,
      userId: user.id as User.Id,
      workspaceId: workspace.id,
    });
  };
}

/**
 * Opens the dataset page, unless the user already left the view. A failure
 * to open it is logged and reported, since the dataset was saved.
 */
function useOpenDataset(): (
  datasetId: Dataset.Id,
  datasetName: string,
) => Promise<void> {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const isMountedRef = useIsMounted();
  return async (datasetId, datasetName) => {
    if (!isMountedRef.current) {
      return;
    }
    try {
      await navigate(
        AppLinks.dataManagerDatasetView({
          workspaceSlug: workspace.slug,
          datasetId,
          datasetName,
        }),
      );
    } catch (error) {
      Logger.error(error, {
        devMsg: "Opening a saved combined dataset failed",
      });
      notifyError(
        t`${datasetName} was saved, but it could not be opened. Open it from the dataset list.`,
      );
    }
  };
}

/**
 * What a saved combined dataset does next: clear its cached copies, say it
 * was created or updated, and open it. A cache that could not be cleared is
 * logged and reported, since the save itself succeeded and the dataset may
 * show old rows until a reload.
 */
function useAfterCombine(): (
  datasetId: Dataset.Id,
  options: SaveCombinedOptions,
) => Promise<void> {
  const { t } = useLingui();
  const clearCaches = useClearCaches();
  const openDataset = useOpenDataset();
  return async (datasetId, options) => {
    const datasetName = options.datasetName.trim();
    try {
      await clearCaches(datasetId);
    } catch (error) {
      Logger.error(error, {
        devMsg: "Clearing a combined dataset's caches failed",
      });
      notifyError(
        t`${datasetName} was saved, but this device may still show its old rows. Reload the page to refresh them.`,
      );
    }
    notifySuccess(
      options.outputDatasetId
        ? t`Updated ${datasetName}.`
        : t`Created ${datasetName}.`,
    );
    await openDataset(datasetId, datasetName);
  };
}

/**
 * Creates or updates a crosswalk's combined dataset from a compile result
 * in one call, then clears its caches, says so, and opens it. A second
 * press while one is in flight is ignored, a save while offline says so and
 * sends nothing, and a refusal is explained from its hint. `isSaving`
 * stays true until the dataset is open, not only until the call returns.
 * Resolves to the dataset's id, or undefined when nothing was saved.
 */
export function useSaveCombinedDataset(): [
  save: (options: SaveCombinedOptions) => Promise<Dataset.Id | undefined>,
  isSaving: boolean,
] {
  const { t } = useLingui();
  const isSavingRef = useRef(false);
  const isMountedRef = useIsMounted();
  const [isSaving, setIsSaving] = useState(false);
  const toErrorMessage = useCrosswalkErrorMessage();
  const afterCombine = useAfterCombine();
  const [, , mutation] = CrosswalkClient.useSaveCombinedDataset({
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
    setIsSaving(true);
    try {
      const datasetId = await _send(mutation.mutateAsync, options);
      if (datasetId !== undefined) {
        await afterCombine(datasetId, options);
      }
      return datasetId;
    } finally {
      isSavingRef.current = false;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };
  return [save, isSaving];
}
