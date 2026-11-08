import { Button, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const NOTIFICATION_ID = "offline-chat-fallback";

let pendingResolver: ((useLocal: boolean) => void) | undefined;

function _finish(value: boolean): void {
  if (pendingResolver) {
    pendingResolver(value);
    pendingResolver = undefined;
  }
}

/**
 * Asks the user whether to answer the failed chat turn with the offline
 * models. Resolves true when the user picks the action, false when they
 * close the notification.
 */
export function offerOfflineChatFallback(copy: {
  title: string;
  message: string;
  action: string;
}): Promise<boolean> {
  if (pendingResolver) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    pendingResolver = resolve;
    notifications.show({
      id: NOTIFICATION_ID,
      title: copy.title,
      message: (
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{copy.message}</Text>
          <Button
            size="compact-sm"
            variant="light"
            onClick={() => {
              _finish(true);
              notifications.hide(NOTIFICATION_ID);
            }}
          >
            {copy.action}
          </Button>
        </Stack>
      ),
      autoClose: false,
      withCloseButton: true,
      onClose: () => {
        _finish(false);
      },
    });
  });
}
