import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Tooltip } from "@mantine/core";
import { IconInfoCircle, IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  help: ReactNode;
  helpClassName: string | undefined;
  onAdd: () => void;
  disabled: boolean;
};

/** Shared help and add controls for numeric chart series fieldsets. */
export function SeriesFieldsetControls({
  help,
  helpClassName,
  onAdd,
  disabled,
}: Readonly<Props>): JSX.Element {
  const { t } = useLingui();
  return (
    <Group justify="space-between">
      <Group gap={6} align="center">
        <Tooltip multiline w={280} label={help}>
          <IconInfoCircle
            size={14}
            aria-label={t`What is a series?`}
            className={helpClassName}
          />
        </Tooltip>
      </Group>
      <Button
        size="xs"
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={onAdd}
        disabled={disabled}
      >
        <Trans>Add series</Trans>
      </Button>
    </Group>
  );
}
