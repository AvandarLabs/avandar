import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Group, Text } from "@mantine/core";
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
      py="xs"
    >
      {/*
       * Kept to one line with the actions inline: this sits inside the query
       * drawer, where a tall banner pushes the form's own controls out of view.
       */}
      <Group gap="sm" wrap="wrap" align="baseline">
        <Text size="xs">
          <Trans>
            The current SQL contains parts the form could not represent.
            Continuing overwrites it with SQL generated from the form.
          </Trans>
        </Text>
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
      </Group>
    </Alert>
  );
}
