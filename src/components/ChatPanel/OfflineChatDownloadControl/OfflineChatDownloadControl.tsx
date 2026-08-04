import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import { useForceUpdate } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconCloudDownload } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import { LocalChatModelStore } from "@/lib/offlineChat/LocalChatModelStore/LocalChatModelStore";
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
  // The store reads below are non-reactive snapshots; forceUpdate re-runs them
  // when the manager becomes ready or the downloaded list changes.
  const forceUpdate = useForceUpdate();

  const isBusy = managerStatus.kind === "downloading";

  const selectedModelId = LocalChatModelStore.readSelectedId();
  const isSelectedDownloaded =
    LocalChatModelStore.isDownloaded(selectedModelId);
  const hasAnyDownloaded = LocalChatModelStore.hasAnyDownloaded();

  useEffect(
    function refreshDownloadStateWhenReady() {
      if (managerStatus.kind === "ready") {
        forceUpdate();
      }
    },
    [managerStatus.kind, forceUpdate],
  );

  const openSettingsModal = useCallback(() => {
    const onDownloadedListChange = (): void => {
      forceUpdate();
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
  }, [t, forceUpdate]);

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
