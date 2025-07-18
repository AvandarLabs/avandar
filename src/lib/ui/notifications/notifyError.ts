import { notifications } from "@mantine/notifications";

const DEFAULT_TITLE = "Error";

export function notifyError(
  titleOrOptions:
    | string
    | {
        title?: string;
        message?: string;
      },
): void {
  const title =
    typeof titleOrOptions === "string" ? titleOrOptions : (
      (titleOrOptions.title ?? DEFAULT_TITLE)
    );
  const message =
    typeof titleOrOptions === "string" ? undefined : titleOrOptions.message;
  notifications.show({
    title,
    message,
    color: "red",
  });
}
