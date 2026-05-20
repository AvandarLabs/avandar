import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { notifications } from "@mantine/notifications";
import type { MantineColor } from "@mantine/core";

const DEFAULT_ERROR_TITLE = msg`Error`;
const DEFAULT_SUCCESS_TITLE = msg`Success`;
const DEFAULT_WARNING_TITLE = msg`Warning`;

function notify(options: {
  title?: string;
  message?: string;
  defaultTitle: string;
  color: MantineColor;
}) {
  const { title, defaultTitle, message, color } = options;
  notifications.show({
    title: title ?? defaultTitle,
    message,
    color,
  });
}

/**
 * Show a success notification. Accepts either a string title or an object
 * containing `title` and `message`. Strings provided by callers should already
 * be translated by the caller.
 */
export function notifySuccess(
  titleOrOptions: string | { title?: string; message?: string },
): void {
  const content =
    typeof titleOrOptions === "string" ?
      { title: titleOrOptions }
    : titleOrOptions;
  notify({
    ...content,
    defaultTitle: i18n._(DEFAULT_SUCCESS_TITLE),
    color: "green",
  });
}

/**
 * Show an error notification. Accepts either a string title or an object
 * containing `title` and `message`. Strings provided by callers should already
 * be translated by the caller.
 */
export function notifyError(
  titleOrOptions: string | { title?: string; message?: string },
  message?: string,
): void {
  const content =
    typeof titleOrOptions === "string" ?
      { title: titleOrOptions, message }
    : titleOrOptions;
  notify({
    ...content,
    defaultTitle: i18n._(DEFAULT_ERROR_TITLE),
    color: "red",
  });
}

/**
 * Show a warning notification. Accepts either a string title or an object
 * containing `title` and `message`. Strings provided by callers should already
 * be translated by the caller.
 */
export function notifyWarning(
  titleOrOptions: string | { title?: string; message?: string },
): void {
  const content =
    typeof titleOrOptions === "string" ?
      { title: titleOrOptions }
    : titleOrOptions;
  notify({
    ...content,
    defaultTitle: i18n._(DEFAULT_WARNING_TITLE),
    color: "orange",
  });
}
