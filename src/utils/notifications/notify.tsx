import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { UntranslatedDetail } from "@/components/UntranslatedDetail/UntranslatedDetail";
import type { MantineColor } from "@mantine/core";
import type { ReactNode } from "react";

const DEFAULT_ERROR_TITLE = msg`Error`;
const DEFAULT_SUCCESS_TITLE = msg`Success`;
const DEFAULT_WARNING_TITLE = msg`Warning`;

function _buildNotificationBody(params: {
  message?: string;
  detail?: string;
}): ReactNode {
  const { message, detail } = params;
  if (detail === undefined || detail === "") {
    return message;
  }
  return (
    <Stack gap="xxs">
      {message === undefined ? null : <Text size="sm">{message}</Text>}
      <UntranslatedDetail detail={detail} />
    </Stack>
  );
}

function notify(options: {
  title?: string;
  message?: string;
  detail?: string;
  defaultTitle: string;
  color: MantineColor;
}) {
  const { title, defaultTitle, message, detail, color } = options;
  notifications.show({
    title: title ?? defaultTitle,
    message: _buildNotificationBody({ message, detail }),
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
    typeof titleOrOptions === "string"
      ? { title: titleOrOptions }
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
 *
 * An optional `detail` is untranslated host text, such as a raw error message.
 * It is shown apart from the translated message, labelled and marked as
 * English, so the translated sentence never embeds it.
 */
export function notifyError(
  titleOrOptions:
    | string
    | { title?: string; message?: string; detail?: string },
  message?: string,
): void {
  const content =
    typeof titleOrOptions === "string"
      ? { title: titleOrOptions, message }
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
    typeof titleOrOptions === "string"
      ? { title: titleOrOptions }
      : titleOrOptions;
  notify({
    ...content,
    defaultTitle: i18n._(DEFAULT_WARNING_TITLE),
    color: "orange",
  });
}
