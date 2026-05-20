import { ActionIcon, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCloudDownload } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { isOfflineChatEnabled } from "@/lib/offlineChat/isOfflineChatEnabled";
import { findLocalChatModel } from "@/lib/offlineChat/localChatModelCatalog";
import {
  isLocalChatModelMarkedDownloaded,
  readStoredLocalChatModelId,
} from "@/lib/offlineChat/localChatModelStore";
import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";

type Props = {
  disabled?: boolean;
};

/**
 * Downloads the selected offline chat model (WebLLM) for use when cloud chat
 * is unavailable.
 */
export function OfflineChatDownloadControl({
  disabled = false,
}: Props): JSX.Element | null {
  const [isReady, setIsReady] = useState(() => {
    return isLocalChatModelMarkedDownloaded(readStoredLocalChatModelId());
  });
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isOfflineChatEnabled()) {
      return;
    }
    return OfflineChatResourceManager.subscribe((status) => {
      if (status.kind === "ready") {
        setIsReady(true);
        setIsBusy(false);
      }
      if (status.kind === "downloading") {
        setIsBusy(true);
      }
      if (status.kind === "error") {
        setIsBusy(false);
      }
    });
  }, []);

  const handleDownload = useCallback(async () => {
    const modelId = readStoredLocalChatModelId();
    const model = findLocalChatModel(modelId);
    setIsBusy(true);
    try {
      await OfflineChatResourceManager.ensureEngine(modelId);
      notifications.show({
        title: "Offline chat model ready",
        message: `${model.displayName} is available when you are offline.`,
        color: "success",
      });
      setIsReady(true);
    } catch (error) {
      notifications.show({
        title: "Offline model download failed",
        message:
          error instanceof Error ?
            error.message
          : "Could not prepare the offline chat model.",
        color: "danger",
      });
    } finally {
      setIsBusy(false);
    }
  }, []);

  if (!isOfflineChatEnabled()) {
    return null;
  }

  const label =
    isReady ? "Offline chat model downloaded" : "Download offline chat model";

  return (
    <Tooltip label={label}>
      <ActionIcon
        variant={isReady ? "light" : "subtle"}
        color={isReady ? "success" : "neutral"}
        size="md"
        aria-label={label}
        disabled={disabled || isBusy || isReady}
        loading={isBusy}
        onClick={() => {
          void handleDownload();
        }}
      >
        <IconCloudDownload size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
