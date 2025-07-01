import { notifications } from "@mantine/notifications";
import { unknownToString } from "@/lib/utils/strings/transformations";

/**
 * An alert that should never go into production.
 *
 * This is a helper function intended as a placeholder during
 * development. It's useful to check that certain callbacks, such as
 * button clicks, are working.
 */
export function notifyDevAlert(...messages: unknown[]): void {
  if (import.meta.env.DEV) {
    notifications.show({
      title: "Alert",
      message: messages
        .map((message) => {
          return unknownToString(message);
        })
        .join(" "),
      color: "red",
    });
  }
}
