import { Alert } from "@mantine/core";
import { Trans } from "@lingui/react/macro";
import { IconWifiOff } from "@tabler/icons-react";
import { isOfflineChatEnabled } from "@/lib/offlineChat/isOfflineChatEnabled";
import { hasAnyDownloadedLocalChatModel } from "@/lib/offlineChat/localChatModelStore";
import { useIsOnline } from "@/lib/offline/useIsOnline";

export function OfflineBanner(): JSX.Element | null {
  const isOnline = useIsOnline();
  if (isOnline) {
    return null;
  }

  const hasLocalChat =
    isOfflineChatEnabled() && hasAnyDownloadedLocalChatModel();

  return (
    <Alert
      icon={<IconWifiOff size={16} />}
      color="yellow"
      radius={0}
      withCloseButton={false}
    >
      {hasLocalChat ?
        <Trans>
          You are offline. Cached datasets and dashboards stay available.
          Cloud chat and imports are paused; you can still ask data questions
          with your downloaded offline model.
        </Trans>
      : <Trans>
          You are offline. The app is in read-only mode: cached datasets and
          dashboards are available, but new imports, cloud chat, and sharing
          are paused until you reconnect.
        </Trans>
      }
    </Alert>
  );
}
