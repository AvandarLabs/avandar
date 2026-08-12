import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { notifications } from "@mantine/notifications";

const NOT_IMPLEMENTED_TITLE = msg`Not implemented yet`;
const NOT_IMPLEMENTED_MESSAGE = msg`This feature is not implemented yet.`;

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
    title: i18n._(NOT_IMPLEMENTED_TITLE),
    message: i18n._(NOT_IMPLEMENTED_MESSAGE),
    color: "red",
  });
}
