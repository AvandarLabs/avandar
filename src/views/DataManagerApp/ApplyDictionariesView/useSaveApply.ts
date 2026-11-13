import { getIsOnline } from "@avandar/browser-utils";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { uuid } from "$/lib/uuid";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { invalidateAfterApply } from "@/views/DataManagerApp/ApplyDictionariesView/invalidateAfterApply/invalidateAfterApply";
import { useApplyErrorMessage } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyErrorMessage";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { MutableRefObject } from "react";

type SaveContents = {
  bindings: readonly DictionaryBinding.Input[];
  addedPairs: readonly DictionaryBinding.AddedPair[];
};

/**
 * One save of the apply flow: attach (nothing converts), change the
 * dataset in place, update a linked dataset's live conversions, or create
 * a new linked dataset.
 */
export type ApplySaveRequest =
  | (SaveContents & { kind: "attach" | "in_place" | "update_linked" })
  | (SaveContents & { kind: "linked"; linkedDatasetName: string });

type SaveRefs = {
  isSavingRef: MutableRefObject<boolean>;
  requestRef: MutableRefObject<ApplySaveRequest | undefined>;
};

/** The success toast for a request. */
function useSuccessMessage(
  datasetName: string,
): (request: ApplySaveRequest) => string {
  const { t } = useLingui();
  return (request) => {
    switch (request.kind) {
      case "attach":
        return request.bindings.length === 0
          ? t`Removed the dictionaries from ${datasetName}. The data is unchanged.`
          : t`Attached to ${datasetName}. The data is unchanged.`;
      case "in_place": {
        const convertedCount = request.bindings.filter((binding) => {
          return binding.mode === "convert";
        }).length;
        return plural(convertedCount, {
          one: `Changed # column of ${datasetName}.`,
          other: `Changed # columns of ${datasetName}.`,
        });
      }
      case "update_linked":
        return t`Updated ${datasetName}.`;
      case "linked": {
        const linkedName = request.linkedDatasetName.trim();
        return t`Created ${linkedName}. The code lists are attached to ${datasetName} for reference.`;
      }
    }
  };
}

/** Opens a dataset's page, unless the user already left the view. */
function useOpenDataset(): (
  datasetId: Dataset.Id,
  datasetName: string,
) => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  return (datasetId, datasetName) => {
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
 * What a successful save does: refresh what it changed, say so, and open
 * the dataset. A new linked dataset is opened by its own mutation, which
 * knows its id.
 */
function useOnSaved(dataset: Dataset.T): (request: ApplySaveRequest) => void {
  const queryClient = useQueryClient();
  const toMessage = useSuccessMessage(dataset.name);
  const openDataset = useOpenDataset();
  return (request) => {
    invalidateAfterApply(queryClient, {
      hasAddedPairs: request.addedPairs.length > 0,
    }).catch((error: unknown) => {
      Logger.error(error, { devMsg: "Refreshing after an apply failed" });
    });
    notifySuccess(toMessage(request));
    if (request.kind !== "linked") {
      openDataset(dataset.id, dataset.name);
    }
  };
}

/** The two apply mutations, sharing their failure and settle handling. */
function useSaveMutations(dataset: Dataset.T, refs: SaveRefs) {
  const onSaved = useOnSaved(dataset);
  const openDataset = useOpenDataset();
  const toErrorMessage = useApplyErrorMessage(dataset.name);
  const callbacks = {
    onError: (error: unknown) => {
      Logger.error(error, { devMsg: "Saving an apply failed" });
      notifyError(toErrorMessage(error));
    },
    onSettled: () => {
      refs.isSavingRef.current = false;
    },
  };
  const notifySaved = (): void => {
    if (refs.requestRef.current) {
      onSaved(refs.requestRef.current);
    }
  };
  const [applyToDataset, isApplying] =
    DictionaryBindingClient.useApplyToDataset({
      ...callbacks,
      onSuccess: notifySaved,
    });
  const [applyAsLinked, isLinking] =
    DictionaryBindingClient.useApplyAsLinkedDataset({
      ...callbacks,
      onSuccess: (linkedDatasetId, variables) => {
        notifySaved();
        openDataset(linkedDatasetId, variables.linkedDatasetName);
      },
    });
  return { applyToDataset, applyAsLinked, isSaving: isApplying || isLinking };
}

/**
 * Saves the apply flow's request in one call, then refreshes what it
 * changed, says what happened, and opens the dataset, or the new linked
 * dataset. A second press while one is in flight is ignored, a save while
 * offline says so and sends nothing, a refusal is explained from its hint,
 * and nothing navigates once the user has left the view.
 */
export function useSaveApply(
  dataset: Dataset.T,
): [save: (request: ApplySaveRequest) => void, isSaving: boolean] {
  const { t } = useLingui();
  const isSavingRef = useRef(false);
  const requestRef = useRef<ApplySaveRequest | undefined>(undefined);
  const mutations = useSaveMutations(dataset, { isSavingRef, requestRef });
  const save = (request: ApplySaveRequest): void => {
    if (isSavingRef.current) {
      return;
    }
    if (!getIsOnline()) {
      notifyError(t`You're offline. Reconnect to save this.`);
      return;
    }
    isSavingRef.current = true;
    requestRef.current = request;
    const { bindings, addedPairs } = request;
    if (request.kind === "linked") {
      mutations.applyAsLinked({
        sourceDatasetId: dataset.id,
        linkedDatasetId: uuid<Dataset.Id>(),
        linkedDatasetName: request.linkedDatasetName.trim(),
        bindings,
        addedPairs,
      });
      return;
    }
    mutations.applyToDataset({ datasetId: dataset.id, bindings, addedPairs });
  };
  return [save, mutations.isSaving];
}
