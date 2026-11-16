import { t } from "@lingui/core/macro";
import { Button, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

/**
 * One id for every derived columns notification, so a newer one replaces the
 * one before it and only the latest Undo is offered.
 */
const NOTIFICATION_ID = "data-explorer-derived-columns";

/**
 * Tells the user which columns a plugin command added to the Data Explorer
 * query, with an Undo button that hides the notification and calls `onUndo`.
 * Replaces the notification of an earlier command. Called by
 * `useDataExplorerPluginBridge` after it applies the derived columns SQL.
 */
export function notifyDerivedColumnsAdded(
  options: Readonly<{ columnNames: readonly string[]; onUndo: () => void }>,
): void {
  const { columnNames, onUndo } = options;
  const columnList = columnNames.join(", ");
  // Mantine ignores `show` while a notification with the same id is open.
  notifications.hide(NOTIFICATION_ID);
  notifications.show({
    id: NOTIFICATION_ID,
    title: t`Columns added`,
    message: (
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{t`Added ${columnList}`}</Text>
        <Button
          size="compact-sm"
          variant="light"
          onClick={() => {
            notifications.hide(NOTIFICATION_ID);
            onUndo();
          }}
        >
          {t`Undo`}
        </Button>
      </Stack>
    ),
    autoClose: 10_000,
    withCloseButton: true,
  });
}
