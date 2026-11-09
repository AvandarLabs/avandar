import { Button, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { uuid } from "$/lib/uuid";
import { notifySuccess } from "@/utils/notifications/notify";

/** The datasets recommended with the one just added, and how to add them. */
type Recommendation = {
  /** Names the recommended datasets. */
  message: string;
  /** The button label that adds them all. */
  action: string;
  /** Adds every recommended dataset. */
  onAddAll: () => void;
};

/**
 * Says a catalog dataset was added to the workspace. When datasets are
 * recommended with it, the notification names them and offers to add them
 * all, and stays open until the user acts on it or closes it. Every string
 * must already be translated by the caller.
 */
export function notifyDatasetAdded(copy: {
  title: string;
  message: string;
  recommendation: Recommendation | undefined;
}): void {
  const { title, message, recommendation } = copy;
  if (recommendation === undefined) {
    notifySuccess({ title, message });
    return;
  }
  const notificationId = `dataset-added-${uuid()}`;
  notifications.show({
    id: notificationId,
    title,
    color: "green",
    autoClose: false,
    withCloseButton: true,
    message: (
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{message}</Text>
        <Text size="sm">{recommendation.message}</Text>
        <Button
          size="compact-sm"
          variant="light"
          onClick={() => {
            notifications.hide(notificationId);
            recommendation.onAddAll();
          }}
        >
          {recommendation.action}
        </Button>
      </Stack>
    ),
  });
}
