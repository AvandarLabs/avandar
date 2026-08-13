import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import css from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/OverwriteSqlAlert/OverwriteSqlAlert.module.css";
import type { ReactNode } from "react";

type Props = {
  onOverwrite: () => void;
  onDismiss: () => void;
};

/**
 * Confirmation shown when a form edit would replace SQL the form could not
 * fully represent. Spans the whole form because it is a decision about the
 * query as a whole, not about one field group.
 */
export function OverwriteSqlAlert({
  onOverwrite,
  onDismiss,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Alert
      icon={<IconAlertTriangle size={16} />}
      color="yellow"
      variant="light"
      title={t`Overwrite SQL?`}
      withCloseButton
      onClose={onDismiss}
      data-testid="overwrite-sql-warning"
    >
      <Text size="xs" mb="xs">
        <Trans>
          The current SQL contains parts that the form could not represent.
          Continuing will overwrite that SQL with one generated from the form.
          This cannot be undone (unless you re-run your previous chat prompt).
        </Trans>
      </Text>
      <Stack gap="xs">
        <Text
          component="button"
          type="button"
          size="xs"
          fw={600}
          c="red"
          onClick={onOverwrite}
          data-testid="overwrite-sql-confirm"
          className={css.unstyledButton}
        >
          <Trans>Overwrite SQL with form changes</Trans>
        </Text>
        <Text
          component="button"
          type="button"
          size="xs"
          c="dimmed"
          onClick={onDismiss}
          data-testid="overwrite-sql-cancel"
          className={css.unstyledButton}
        >
          <Trans>Keep SQL as-is</Trans>
        </Text>
      </Stack>
    </Alert>
  );
}
