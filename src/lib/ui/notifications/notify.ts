import { MantineColor } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const DEFAULT_ERROR_TITLE = "Error";
const DEFAULT_SUCCESS_TITLE = "Success";
const DEFAULT_WARNING_TITLE = "Warning";

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

export function notifySuccess(
  titleOrOptions: string | { title?: string; message?: string },
): void {
  const content =
    typeof titleOrOptions === "string" ?
      { title: titleOrOptions }
    : titleOrOptions;
  notify({ ...content, defaultTitle: DEFAULT_SUCCESS_TITLE, color: "green" });
}

export function notifyError(
  titleOrOptions: string | { title?: string; message?: string },
  message?: string,
): void {
  const content =
    typeof titleOrOptions === "string" ?
      { title: titleOrOptions, message }
    : titleOrOptions;
  notify({ ...content, defaultTitle: DEFAULT_ERROR_TITLE, color: "red" });
}

export function notifyWarning(
  titleOrOptions: string | { title?: string; message?: string },
): void {
  const content =
    typeof titleOrOptions === "string" ?
      { title: titleOrOptions }
    : titleOrOptions;
  notify({ ...content, defaultTitle: DEFAULT_WARNING_TITLE, color: "orange" });
}
