import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCloudDownload } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  findLocalChatModel,
  LOCAL_CHAT_MODELS,
} from "@/lib/offlineChat/localChatModelCatalog";
import {
  isLocalChatModelMarkedDownloaded,
  readStoredLocalChatModelId,
  writeStoredLocalChatModelId,
} from "@/lib/offlineChat/localChatModelStore";
import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { useOfflineChatManagerStatus } from "@/lib/offlineChat/useOfflineChatManagerStatus";
import type { LocalChatModelId } from "@/lib/offlineChat/localChatModelCatalog";

type Props = {
  disabled?: boolean;
};

/**
 * Downloads the selected offline chat model (WebLLM) for use when cloud chat
 * is unavailable. Opens a confirmation modal so the user can pick which
 * model to download; progress appears in the bottom-right corner.
 */
export function OfflineChatDownloadControl({
  disabled = false,
}: Props): JSX.Element {
  const { t } = useLingui();
  const managerStatus = useOfflineChatManagerStatus();
  const [selectedModelId, setSelectedModelId] = useState<LocalChatModelId>(
    () => {
      return readStoredLocalChatModelId();
    },
  );
  const [isReady, setIsReady] = useState(() => {
    return isLocalChatModelMarkedDownloaded(readStoredLocalChatModelId());
  });
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const isBusy = managerStatus.kind === "downloading";

  useEffect(() => {
    if (managerStatus.kind === "ready") {
      setIsReady(
        isLocalChatModelMarkedDownloaded(readStoredLocalChatModelId()),
      );
    }
  }, [managerStatus]);

  useEffect(() => {
    setIsReady(isLocalChatModelMarkedDownloaded(selectedModelId));
  }, [selectedModelId]);

  useEffect(() => {
    try {
      writeStoredLocalChatModelId(selectedModelId);
    } catch {
      // Ignore storage errors.
    }
  }, [selectedModelId]);

  const handleConfirmDownload = useCallback(async () => {
    setIsPromptOpen(false);
    const model = findLocalChatModel(selectedModelId);
    try {
      await OfflineChatResourceManager.ensureEngine(selectedModelId);
      notifications.show({
        title: t`Offline chat model ready`,
        message: t`${model.displayName} is available when you are offline.`,
        color: "success",
      });
      setIsReady(true);
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
  }, [selectedModelId, t]);

  const selectedModel = findLocalChatModel(selectedModelId);
  const modelSelectData = LOCAL_CHAT_MODELS.map((model) => {
    return {
      value: model.id,
      label: `${model.displayName} (~${model.approxSizeMb} MB)`,
    };
  });

  const label =
    isReady ? t`Offline chat model downloaded` : t`Download offline chat model`;

  return (
    <>
      <Tooltip label={label}>
        <ActionIcon
          variant={isReady ? "light" : "subtle"}
          color={isReady ? "success" : "neutral"}
          size="md"
          aria-label={label}
          disabled={disabled || isBusy || isReady}
          loading={isBusy}
          onClick={() => {
            setIsPromptOpen(true);
          }}
        >
          <IconCloudDownload size={16} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={isPromptOpen}
        onClose={() => {
          setIsPromptOpen(false);
        }}
        title={t`Download offline chat model`}
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              Offline chat runs entirely on your device using WebLLM. Pick a
              model to download once; progress appears in the bottom-right
              corner. Smaller models download faster but may be weaker on
              complex questions.
            </Trans>
          </Text>

          <Select
            label={t`Model`}
            description={t`${selectedModel.description} (~${selectedModel.approxSizeMb} MB)`}
            value={selectedModelId}
            onChange={(value) => {
              if (value) {
                setSelectedModelId(value as LocalChatModelId);
              }
            }}
            data={modelSelectData}
            comboboxProps={{ withinPortal: true }}
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                setIsPromptOpen(false);
              }}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="filled"
              color="primary"
              onClick={() => {
                void handleConfirmDownload();
              }}
            >
              <Trans>Download</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
