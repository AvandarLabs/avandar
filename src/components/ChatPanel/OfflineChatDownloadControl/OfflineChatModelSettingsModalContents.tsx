import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Group,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  formatModelSelectDescription,
  formatModelSelectLabel,
} from "@/lib/localModels/formatModelPickerCopy";
import {
  findLocalChatModel,
  LOCAL_CHAT_MODELS,
} from "@/lib/offlineChat/localChatModelCatalog";
import {
  isLocalChatModelMarkedDownloaded,
  listDownloadedLocalChatModelIds,
  readStoredLocalChatModelId,
  writeStoredLocalChatModelId,
} from "@/lib/offlineChat/localChatModelStore";
import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { useOfflineChatManagerStatus } from "@/lib/offlineChat/useOfflineChatManagerStatus";
import type { LocalChatModelId } from "@/lib/offlineChat/localChatModelCatalog";

type Props = {
  settingsModalId: string;
  onClose: () => void;
  /** Bumps toolbar icon state when downloads or deletes change. */
  onDownloadedListChange?: () => void;
};

/** Remounts settings modal body from localStorage after delete/download. */
export function createOfflineChatModelSettingsModalChildren({
  settingsModalId,
  onDownloadedListChange,
}: {
  settingsModalId: string;
  onDownloadedListChange?: () => void;
}): JSX.Element {
  return (
    <OfflineChatModelSettingsModalContents
      settingsModalId={settingsModalId}
      onClose={() => {
        modals.close(settingsModalId);
      }}
      onDownloadedListChange={onDownloadedListChange}
    />
  );
}

function refreshSettingsModal({
  settingsModalId,
  onDownloadedListChange,
}: {
  settingsModalId: string;
  onDownloadedListChange?: () => void;
}): void {
  modals.updateModal({
    modalId: settingsModalId,
    children: createOfflineChatModelSettingsModalChildren({
      settingsModalId,
      onDownloadedListChange,
    }),
  });
}

/**
 * Body for the offline chat model settings dialog opened via `@mantine/modals`
 * so delete confirmations stack above it.
 */
export function OfflineChatModelSettingsModalContents({
  settingsModalId,
  onClose,
  onDownloadedListChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const managerStatus = useOfflineChatManagerStatus();
  const [selectedModelId, setSelectedModelId] = useState<LocalChatModelId>(
    () => {
      return readStoredLocalChatModelId();
    },
  );
  const [downloadedRevision, setDownloadedRevision] = useState(0);
  const [deletingModelId, setDeletingModelId] =
    useState<LocalChatModelId | null>(null);

  const isBusy = managerStatus.kind === "downloading";

  void downloadedRevision;
  const isSelectedDownloaded =
    isLocalChatModelMarkedDownloaded(selectedModelId);
  const downloadedModelIds = listDownloadedLocalChatModelIds();

  useEffect(() => {
    if (managerStatus.kind === "ready") {
      setDownloadedRevision((revision) => {
        return revision + 1;
      });
    }
  }, [managerStatus.kind]);

  useEffect(() => {
    try {
      writeStoredLocalChatModelId(selectedModelId);
    } catch {
      // Ignore storage errors.
    }
  }, [selectedModelId]);

  const handleConfirmDownload = useCallback(async () => {
    onClose();
    const model = findLocalChatModel(selectedModelId);
    try {
      await OfflineChatResourceManager.ensureEngine(selectedModelId);
      notifications.show({
        title: t`Offline chat model ready`,
        message: t`${model.displayName} is available when you are offline.`,
        color: "success",
      });
      setDownloadedRevision((revision) => {
        return revision + 1;
      });
    } catch (error) {
      notifications.show({
        title: t`Offline model download failed`,
        message:
          error instanceof Error ?
            error.message
          : t`Could not prepare the offline chat model.`,
        color: "danger",
      });
    }
  }, [onClose, selectedModelId, t]);

  const handleDeleteModel = useCallback(
    async (modelId: LocalChatModelId) => {
      setDeletingModelId(modelId);
      try {
        await OfflineChatResourceManager.deleteModel(modelId);
        const model = findLocalChatModel(modelId);
        notifications.show({
          title: t`Offline chat model removed`,
          message: t`${model.displayName} was deleted from this browser.`,
          color: "success",
        });
        onDownloadedListChange?.();
        refreshSettingsModal({ settingsModalId, onDownloadedListChange });
      } catch (error) {
        notifications.show({
          title: t`Could not remove offline chat model`,
          message:
            error instanceof Error ?
              error.message
            : t`Unable to delete the offline chat model from cache.`,
          color: "danger",
        });
      } finally {
        setDeletingModelId(null);
      }
    },
    [onDownloadedListChange, settingsModalId, t],
  );

  const requestDeleteModel = useCallback(
    (modelId: LocalChatModelId) => {
      const model = findLocalChatModel(modelId);
      modals.openConfirmModal({
        title: t`Remove offline chat model?`,
        labels: { confirm: t`Remove`, cancel: t`Cancel` },
        confirmProps: { color: "danger" },
        children: (
          <Text size="sm">
            <Trans>
              {model.displayName} (~{model.approxSizeMb} MB) will be deleted
              from this browser to free space. You can download it again later.
            </Trans>
          </Text>
        ),
        onConfirm: () => {
          void handleDeleteModel(modelId);
        },
      });
    },
    [handleDeleteModel, t],
  );

  const selectedModel = findLocalChatModel(selectedModelId);
  const modelSelectData = LOCAL_CHAT_MODELS.map((model) => {
    const downloadedSuffix =
      isLocalChatModelMarkedDownloaded(model.id) ? t` · downloaded` : "";
    return {
      value: model.id,
      label: formatModelSelectLabel({
        displayName: model.displayName,
        systemRequirements: model.systemRequirements,
        approxSizeMb: model.approxSizeMb,
        downloadedSuffix,
      }),
    };
  });

  const downloadButtonLabel =
    isSelectedDownloaded ? t`Re-download` : t`Download`;

  const controlsDisabled = isBusy || deletingModelId !== null;

  return (
    <Stack gap="md">
      <Text size="sm">
        <Trans>
          Pick a model to download. You can switch models or re-download later.
        </Trans>
      </Text>

      <Select
        label={t`Model`}
        description={formatModelSelectDescription({
          description: selectedModel.description,
          recommendedIf: selectedModel.recommendedIf,
          approxSizeMb: selectedModel.approxSizeMb,
        })}
        value={selectedModelId}
        onChange={(value) => {
          if (value) {
            setSelectedModelId(value as LocalChatModelId);
          }
        }}
        data={modelSelectData}
        comboboxProps={{ withinPortal: true }}
        disabled={controlsDisabled}
      />

      {downloadedModelIds.length > 0 ?
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            <Trans>Downloaded on this browser</Trans>
          </Text>
          {downloadedModelIds.map((modelId) => {
            const model = findLocalChatModel(modelId);
            const isDeleting = deletingModelId === modelId;
            return (
              <Group key={modelId} justify="space-between" wrap="nowrap">
                <Text size="sm" truncate>
                  {model.displayName}
                </Text>
                <Tooltip label={t`Remove ${model.displayName}`}>
                  <ActionIcon
                    variant="subtle"
                    color="neutral"
                    size="sm"
                    aria-label={t`Remove ${model.displayName}`}
                    loading={isDeleting}
                    disabled={controlsDisabled}
                    onClick={() => {
                      requestDeleteModel(modelId);
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            );
          })}
        </Stack>
      : null}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          variant="filled"
          color="primary"
          loading={isBusy}
          disabled={controlsDisabled}
          onClick={() => {
            void handleConfirmDownload();
          }}
        >
          {downloadButtonLabel}
        </Button>
      </Group>
    </Stack>
  );
}
