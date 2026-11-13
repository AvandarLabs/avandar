import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The toast for a refused apply, from the RPC's hint. */
function useApplyErrorMessage(datasetName: string): (error: unknown) => string {
  const { t } = useLingui();
  return (error) => {
    const hint = DictionaryBinding.toApplyErrorHint(error);
    if (hint === "dataset_editor_required") {
      return t`You need edit access to ${datasetName} to apply a dictionary.`;
    }
    return hint === "entry_not_in_dictionary" ||
      hint === "code_list_not_in_entry"
      ? t`A dictionary changed while you were applying it. Reload the page and try again.`
      : t`The dictionaries were not attached. Please try again.`;
  };
}

/** Goes back to the dataset, unless the user already left the view. */
function useReturnToDataset(dataset: Dataset.T): () => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  return () => {
    if (isMountedRef.current) {
      navigate(
        AppLinks.dataManagerDatasetView({
          workspaceSlug: workspace.slug,
          datasetId: dataset.id,
          datasetName: dataset.name,
        }),
      );
    }
  };
}

/**
 * Attaches the picked entries to a dataset in one call, then returns to the
 * dataset with a toast. Sending no bindings removes every dictionary, and
 * the toast says so. A second press while the first is in flight is
 * ignored, and nothing navigates once the user has left the view.
 */
export function useAttachDictionaries(
  dataset: Dataset.T,
): [
  attach: (bindings: readonly DictionaryBinding.Input[]) => void,
  isAttaching: boolean,
] {
  const { t } = useLingui();
  const returnToDataset = useReturnToDataset(dataset);
  const toErrorMessage = useApplyErrorMessage(dataset.name);
  const isAttachingRef = useRef(false);
  const isRemovingRef = useRef(false);
  const datasetName = dataset.name;
  const [applyToDataset, isAttaching] =
    DictionaryBindingClient.useApplyToDataset({
      queryToInvalidate: [DictionaryBindingClient.getClientName()],
      onSuccess: () => {
        notifySuccess(
          isRemovingRef.current
            ? t`Removed the dictionaries from ${datasetName}. The data is unchanged.`
            : t`Attached to ${datasetName}. The data is unchanged.`,
        );
        returnToDataset();
      },
      onError: (error) => {
        Logger.error(error, { devMsg: "Applying dictionaries failed" });
        notifyError(toErrorMessage(error));
      },
      onSettled: () => {
        isAttachingRef.current = false;
      },
    });
  const attach = (bindings: readonly DictionaryBinding.Input[]): void => {
    if (isAttachingRef.current) {
      return;
    }
    isAttachingRef.current = true;
    isRemovingRef.current = bindings.length === 0;
    applyToDataset({ datasetId: dataset.id, bindings });
  };
  return [attach, isAttaching];
}
