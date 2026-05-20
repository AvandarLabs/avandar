import { notifications } from "@mantine/notifications";

let pendingResolver: ((useLocal: boolean) => void) | null = null;

/**
 * Asks the user whether to run the failed chat turn with the downloaded local
 * model. Resolves false when dismissed or when the user rejects.
 */
export function offerOfflineChatFallback(): Promise<boolean> {
  if (pendingResolver) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    pendingResolver = resolve;
    const notificationId = "offline-chat-fallback";

    notifications.show({
      id: notificationId,
      title: "Chat request failed",
      message:
        "The cloud assistant is unreachable. Use your downloaded on-device model for this message?",
      autoClose: false,
      withCloseButton: true,
      onClose: () => {
        finish(false);
      },
      actions: [
        {
          label: "Use offline model",
          onClick: () => {
            notifications.hide(notificationId);
            finish(true);
          },
        },
        {
          label: "Cancel",
          color: "gray",
          onClick: () => {
            notifications.hide(notificationId);
            finish(false);
          },
        },
      ],
    });

    function finish(value: boolean): void {
      if (pendingResolver) {
        pendingResolver(value);
        pendingResolver = null;
      }
    }
  });
}
