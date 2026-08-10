import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { useCallback, useState } from "react";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

type Props = {
  onDeleted: () => void;
};

/** Owns confirmation, progress, and notifications for local-model deletion. */
export function useDeleteOfflineChatModel({ onDeleted }: Props): {
  deletingModelId: LocalChatModel.Id | undefined;
  onRequestDelete: (modelId: LocalChatModel.Id) => void;
} {
  const { t } = useLingui();
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const [deletingModelId, setDeletingModelId] = useState<LocalChatModel.Id>();

  const onDelete = useCallback(
    async (modelId: LocalChatModel.Id) => {
      setDeletingModelId(modelId);
      try {
        await OfflineChatEngineStore.deleteModel(modelId);
        const model = LocalChatModel.Catalog.find(modelId);
        const modelCopy = getLocalChatModelCopy(model);
        notifySuccess({
          title: t`Offline chat model removed`,
          message: t`${modelCopy.displayName} was deleted from this browser.`,
        });
        onDeleted();
      } catch {
        notifyError({
          title: t`Could not remove offline chat model`,
          message: t`Unable to delete the offline chat model from cache.`,
        });
      } finally {
        setDeletingModelId(undefined);
      }
    },
    [getLocalChatModelCopy, onDeleted, t],
  );

  const onRequestDelete = useCallback(
    (modelId: LocalChatModel.Id) => {
      const model = LocalChatModel.Catalog.find(modelId);
      const modelCopy = getLocalChatModelCopy(model);
      modals.openConfirmModal({
        title: t`Remove offline chat model?`,
        labels: { confirm: t`Remove`, cancel: t`Cancel` },
        confirmProps: { color: "danger" },
        children: (
          <Text size="sm">
            <Trans>
              {modelCopy.displayName} (~{model.approxSizeMb} MB) will be deleted
              from this browser to free space. You can download it again later.
            </Trans>
          </Text>
        ),
        onConfirm: () => {
          void onDelete(modelId);
        },
      });
    },
    [getLocalChatModelCopy, onDelete, t],
  );

  return { deletingModelId, onRequestDelete };
}
