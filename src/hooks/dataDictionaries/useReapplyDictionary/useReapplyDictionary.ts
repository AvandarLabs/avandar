import { getIsOnline } from "@avandar/browser-utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type ReapplyNames = { datasetName: string; dictionaryName: string };

/** The toast for a refused re-apply, from the RPC's hint. */
function useReapplyErrorMessage({
  datasetName,
  dictionaryName,
}: Readonly<ReapplyNames>): (error: unknown) => string {
  const { t } = useLingui();
  return (error) => {
    switch (DictionaryBinding.toApplyErrorHint(error)) {
      case "dataset_editor_required":
        return t`You need edit access to ${datasetName} to re-apply a dictionary.`;
      case "dictionary_viewer_required":
        return t`You can no longer read ${dictionaryName}, so it was not re-applied.`;
      case "nothing_to_reapply":
        return t`${datasetName} already has the current version of ${dictionaryName}.`;
      default:
        return t`${dictionaryName} was not re-applied to ${datasetName}. Please try again.`;
    }
  };
}

/** Refreshes everything a re-apply changes. */
function useRefreshAfterReapply(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [DictionaryBindingClient.getClientName()],
      }),
      queryClient.invalidateQueries({
        queryKey: [DatasetColumnClient.getClientName()],
      }),
      invalidateDatasetRowQueries(queryClient),
    ]);
  };
}

/**
 * Re-applies one dictionary to one dataset converted in place: its pinned
 * columns take the dictionary's current pairs and version. A success
 * refreshes the bindings, the dataset's columns, and the shown rows, and
 * toasts. Offline it says to reconnect and sends nothing. A second call
 * while one is in flight is ignored. Used by Re-apply in the Dictionary
 * view's Used by tab and the dataset rail.
 */
export function useReapplyDictionary(
  options: Readonly<
    ReapplyNames & { datasetId: Dataset.Id; dictionaryId: DataDictionary.Id }
  >,
): [reapply: () => void, isReapplying: boolean] {
  const { t } = useLingui();
  const { datasetName, dictionaryName } = options;
  const toErrorMessage = useReapplyErrorMessage(options);
  const refresh = useRefreshAfterReapply();
  const isReapplyingRef = useRef(false);
  const [reapplyDictionary, isReapplying] =
    DictionaryBindingClient.useReapplyDictionary({
      onSuccess: async () => {
        await refresh();
        notifySuccess(t`Re-applied ${dictionaryName} to ${datasetName}.`);
      },
      onError: (error: unknown) => {
        Logger.error(error, { devMsg: "Re-applying a dictionary failed" });
        notifyError(toErrorMessage(error));
      },
      onSettled: () => {
        isReapplyingRef.current = false;
      },
    });
  const reapply = (): void => {
    if (!getIsOnline()) {
      notifyError(t`You're offline. Reconnect to save this.`);
      return;
    }
    if (isReapplyingRef.current) {
      return;
    }
    isReapplyingRef.current = true;
    reapplyDictionary({
      datasetId: options.datasetId,
      dictionaryId: options.dictionaryId,
    });
  };
  return [reapply, isReapplying];
}
