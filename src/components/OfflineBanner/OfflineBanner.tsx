import { Alert } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { useIsOnline } from "@/lib/offline/useIsOnline";

export function OfflineBanner(): JSX.Element | null {
  const isOnline = useIsOnline();
  if (isOnline) {
    return null;
  }

  return (
    <Alert
      icon={<IconWifiOff size={16} />}
      color="yellow"
      radius={0}
      withCloseButton={false}
    >
      You are offline. The app is in read-only mode: cached datasets and
      dashboards are available, but new imports, chat, and sharing are paused
      until you reconnect.
    </Alert>
  );
}
