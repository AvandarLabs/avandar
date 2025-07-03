import { notifications } from "@mantine/notifications";

export function notifyError({
  title = "Error",
  message,
}: {
  title?: string;
  message?: string;
} = {}): void {
  notifications.show({
    title,
    message,
    color: "red",
  });
}
