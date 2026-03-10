import { notifications } from "@mantine/notifications";

/**
 * Notifies the user that a feature is not implemented yet.
 *
 * This should never go into production.
 *
 * This is a helper function intended as a placeholder until a callback's
 * real functionality gets implemented. It's useful during development
 * to mark callbacks, such as button clicks, that still need implementing.
 */
export function notifyNotImplemented(): void {
  notifications.show({
    title: "Not implemented yet",
    message: "This feature is not implemented yet.",
    color: "red",
  });
}
