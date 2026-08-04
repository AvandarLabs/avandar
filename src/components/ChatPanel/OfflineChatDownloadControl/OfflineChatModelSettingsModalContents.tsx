import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { useForceUpdate } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifyError, notifySuccess } from "@ui";
import { useCallback, useEffect, useState } from "react";
import { ModelPickerCopy } from "@/lib/localModels/ModelPickerCopy/ModelPickerCopy";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { OfflineChatResourceManager } from "@/clients/LocalChatModel/OfflineChatResourceManager";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";
import { useOfflineChatManagerStatus } from "@/hooks/localChatModels/useOfflineChatManagerStatus";
import { DownloadedModelList } from "./DownloadedModelList";
import { useDeleteOfflineChatModel } from "./useDeleteOfflineChatModel";

type Props = {
  settingsModalId: string;
  onClose: () => void;
  /** Bumps toolbar icon state when downloads or deletes change. */
  onDownloadedListChange?: () => void;
};

/**
 * Remounts settings modal body from localStorage after delete/download.
 * Must be a function returning JSX (not a component) because
 * `modals.updateModal` takes `children` as a ReactNode value.
 */
// eslint-disable-next-line react-refresh/only-export-components
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
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const managerStatus = useOfflineChatManagerStatus();
  const [selectedModelId, setSelectedModelId] = useState<LocalChatModel.Id>(
    () => {
      return LocalChatModelStore.readSelectedId();
    },
  );
  // The store reads below are non-reactive snapshots; forceUpdate re-runs them
  // when the manager becomes ready.
  const forceUpdate = useForceUpdate();
  const onModelDeleted = useCallback(() => {
    onDownloadedListChange?.();
    refreshSettingsModal({ settingsModalId, onDownloadedListChange });
  }, [onDownloadedListChange, settingsModalId]);
  const { deletingModelId, onRequestDelete } = useDeleteOfflineChatModel({
    onDeleted: onModelDeleted,
  });

  const isBusy = managerStatus.kind === "downloading";

  const isSelectedDownloaded =
    LocalChatModelStore.isDownloaded(selectedModelId);
  const downloadedModelIds = LocalChatModelStore.listDownloadedIds();

  useEffect(
    function refreshDownloadedModelsWhenReady() {
      if (managerStatus.kind === "ready") {
        forceUpdate();
      }
    },
    [managerStatus.kind, forceUpdate],
  );

  useEffect(
    function persistSelectedModel() {
      try {
        LocalChatModelStore.writeSelectedId(selectedModelId);
      } catch {
        // Ignore storage errors.
      }
    },
    [selectedModelId],
  );

  const onConfirmDownload = useCallback(async () => {
    onClose();
    const model = LocalChatModel.Catalog.find(selectedModelId);
    const modelCopy = getLocalChatModelCopy(model);
    try {
      await OfflineChatResourceManager.ensureEngine(selectedModelId);
      notifySuccess({
        title: t`Offline chat model ready`,
        message: t`${modelCopy.displayName} is available when you are offline.`,
      });
      forceUpdate();
    } catch {
      notifyError({
        title: t`Offline model download failed`,
        message: t`Could not prepare the offline chat model.`,
      });
    }
  }, [forceUpdate, getLocalChatModelCopy, onClose, selectedModelId, t]);

  const selectedModel = LocalChatModel.Catalog.find(selectedModelId);
  const selectedModelCopy = getLocalChatModelCopy(selectedModel);
  const modelSelectData = LocalChatModel.Catalog.values.map((model) => {
    const modelCopy = getLocalChatModelCopy(model);
    const downloadedSuffix =
      LocalChatModelStore.isDownloaded(model.id) ? t` · downloaded` : "";
    return {
      value: model.id,
      label: ModelPickerCopy.formatLabel({
        displayName: modelCopy.displayName,
        systemRequirements: modelCopy.systemRequirements,
        approxSizeMb: model.approxSizeMb,
        downloadedSuffix,
      }),
    };
  });

  const downloadButtonLabel =
    isSelectedDownloaded ? t`Re-download` : t`Download`;

  const controlsDisabled = isBusy || deletingModelId !== undefined;

  return (
    <Stack gap="md">
      <Text size="sm">
        <Trans>
          Pick a model to download. You can switch models or re-download later.
        </Trans>
      </Text>

      <Select
        label={t`Model`}
        description={ModelPickerCopy.formatDescription({
          description: selectedModelCopy.description,
          recommendedIf: selectedModelCopy.recommendedIf,
          approxSizeMb: selectedModel.approxSizeMb,
        })}
        value={selectedModelId}
        onChange={(value) => {
          if (value) {
            setSelectedModelId(value as LocalChatModel.Id);
          }
        }}
        data={modelSelectData}
        comboboxProps={{ withinPortal: true }}
        disabled={controlsDisabled}
      />

      <DownloadedModelList
        downloadedModelIds={downloadedModelIds}
        deletingModelId={deletingModelId}
        areControlsDisabled={controlsDisabled}
        onRequestDelete={onRequestDelete}
      />

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
            void onConfirmDownload();
          }}
        >
          {downloadButtonLabel}
        </Button>
      </Group>
    </Stack>
  );
}
