import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCloudDownload } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  hasAnyDownloadedLocalChatModel,
  isLocalChatModelMarkedDownloaded,
  readStoredLocalChatModelId,
} from "@/lib/offlineChat/localChatModelStore";
import { useOfflineChatManagerStatus } from "@/lib/offlineChat/useOfflineChatManagerStatus";
import { createOfflineChatModelSettingsModalChildren } from "./OfflineChatModelSettingsModalContents";

type Props = {
  disabled?: boolean;
};

/**
 * Downloads the selected offline chat model (WebLLM) for use when cloud chat
 * is unavailable. Opens a modal to pick or switch models; progress appears in
 * the bottom-left corner.
 */
export function OfflineChatDownloadControl({
  disabled = false,
}: Props): JSX.Element {
  const { t } = useLingui();
  const managerStatus = useOfflineChatManagerStatus();
  const [downloadedRevision, setDownloadedRevision] = useState(0);

  const isBusy = managerStatus.kind === "downloading";

  void downloadedRevision;
  const selectedModelId = readStoredLocalChatModelId();
  const isSelectedDownloaded =
    isLocalChatModelMarkedDownloaded(selectedModelId);
  const hasAnyDownloaded = hasAnyDownloadedLocalChatModel();

  useEffect(() => {
    if (managerStatus.kind === "ready") {
      setDownloadedRevision((revision) => {
        return revision + 1;
      });
    }
  }, [managerStatus.kind]);

  const openSettingsModal = useCallback(() => {
    const onDownloadedListChange = (): void => {
      setDownloadedRevision((revision) => {
        return revision + 1;
      });
    };
    const modalId = modals.open({
      title: t`Offline chat model`,
      size: "md",
      children: null,
    });
    modals.updateModal({
      modalId,
      children: createOfflineChatModelSettingsModalChildren({
        settingsModalId: modalId,
        onDownloadedListChange,
      }),
    });
  }, [t]);

  const tooltipLabel =
    !hasAnyDownloaded ? t`Download offline chat model (WebLLM)`
    : isSelectedDownloaded ?
      t`Offline chat model ready. Click to switch or re-download.`
    : t`Download a different offline chat model`;

  return (
    <Tooltip label={tooltipLabel}>
      <ActionIcon
        variant={hasAnyDownloaded ? "light" : "subtle"}
        color={hasAnyDownloaded ? "success" : "neutral"}
        size="md"
        aria-label={tooltipLabel}
        disabled={disabled || isBusy}
        loading={isBusy}
        onClick={openSettingsModal}
      >
        <IconCloudDownload size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
