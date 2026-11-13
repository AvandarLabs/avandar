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

/**
 * Attaches the picked entries to a dataset in one call, then returns to the
 * dataset with a toast. A second press while the first is in flight is
 * ignored, and nothing navigates once the user has left the view.
 */
export function useAttachDictionaries(
  dataset: Dataset.T,
): [
  attach: (bindings: readonly DictionaryBinding.Input[]) => void,
  isAttaching: boolean,
] {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  const isAttachingRef = useRef(false);
  const datasetName = dataset.name;
  const [applyToDataset, isAttaching] =
    DictionaryBindingClient.useApplyToDataset({
      queryToInvalidate: [DictionaryBindingClient.getClientName()],
      onSuccess: () => {
        notifySuccess(t`Attached to ${datasetName}. The data is unchanged.`);
        if (isMountedRef.current) {
          navigate(
            AppLinks.dataManagerDatasetView({
              workspaceSlug: workspace.slug,
              datasetId: dataset.id,
              datasetName,
            }),
          );
        }
      },
      onError: (error) => {
        Logger.error(error, { devMsg: "Applying dictionaries failed" });
        const hint = DictionaryBinding.toApplyErrorHint(error);
        notifyError(
          hint === "dataset_editor_required"
            ? t`You need edit access to ${datasetName} to apply a dictionary.`
            : hint === "entry_not_in_dictionary" ||
                hint === "code_list_not_in_entry"
              ? t`A dictionary changed while you were applying it. Reload the page and try again.`
              : t`The dictionaries were not attached. Please try again.`,
        );
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
    applyToDataset({ datasetId: dataset.id, bindings });
  };
  return [attach, isAttaching];
}
