import { notifications } from "@mantine/notifications";

const DEFAULT_TITLE = "Error";

export function notifyError(
  titleOrOptions:
    | string
    | {
        title?: string;
        message?: string;
      },
  message?: string,
): void {
  const title =
    typeof titleOrOptions === "string" ? titleOrOptions : (
      (titleOrOptions.title ?? DEFAULT_TITLE)
    );
  const messageToUse =
    typeof titleOrOptions === "string" ? message : (
      (message ?? titleOrOptions.message)
    );
  notifications.show({
    title,
    message: messageToUse,
    color: "red",
  });
}
