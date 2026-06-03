import { useAui } from "@assistant-ui/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import css from "./RegenerateErrorBanner.module.css";

/**
 * Sits above the composer and only renders when the most recent SQL turn
 * failed at runtime. One click sends a fix-it prompt to the thread; the
 * backend already receives the prior SQL and the error via `ChatPageContext`,
 * so the model has everything it needs to repair the query.
 *
 * One retry only: the banner clears the error optimistically so it doesn't
 * loop on the same failure. If the regenerated SQL also fails, the banner
 * reappears with the new error, but the action is deliberately the user's
 * decision each time rather than an automatic retry.
 */
export function RegenerateErrorBanner(): JSX.Element | null {
  const { lastQueryError, rawSQL } = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const aui = useAui();
  const { t } = useLingui();

  if (!lastQueryError || !rawSQL) {
    return null;
  }

  return (
    <Stack gap="xs" px="md" py="sm" bg="danger.0" className={css.root}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <IconAlertTriangle
          size={16}
          color="var(--mantine-color-danger-7)"
          className={css.icon}
        />
        <Stack gap={2} className={css.messageColumn}>
          <Text size="xs" fw={600} c="danger.9">
            <Trans>That query failed</Trans>
          </Text>
          <Text size="xs" c="neutral.7" className={css.errorText}>
            {lastQueryError}
          </Text>
        </Stack>
      </Group>
      <Group justify="flex-end">
        <Button
          size="compact-xs"
          variant="filled"
          color="danger"
          onClick={() => {
            // Clear the error optimistically so the banner closes after one
            // click. If the regenerated SQL also fails, useDataQuery will set
            // it again and the banner returns with the new error.
            dispatch.setLastQueryError(undefined);
            aui.thread().append({
              role: "user",
              content: [
                {
                  type: "text",
                  text: t`That query failed. Please fix the SQL and try again.`,
                },
              ],
            });
          }}
        >
          <Trans>Regenerate with the error</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
