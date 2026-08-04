import { notifications } from "@mantine/notifications";

let pendingResolver: ((useLocal: boolean) => void) | undefined;

/**
 * Asks the user whether to run the failed chat turn with the downloaded local
 * model. Resolves false when dismissed or when the user rejects.
 */
export function offerOfflineChatFallback(copy: {
  title: string;
  message: string;
}): Promise<boolean> {
  if (pendingResolver) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    pendingResolver = resolve;
    const notificationId = "offline-chat-fallback";

    notifications.show({
      id: notificationId,
      title: copy.title,
      message: copy.message,
      autoClose: false,
      withCloseButton: true,
      onClose: () => {
        finish(false);
      },
    });

    function finish(value: boolean): void {
      if (pendingResolver) {
        pendingResolver(value);
        pendingResolver = undefined;
      }
    }
  });
}
