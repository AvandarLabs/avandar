import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * The Missing value column's heading and an info icon that explains the
 * flag. The icon is a button so it can be reached with the keyboard, and
 * its tooltip opens on focus as well as on hover.
 */
export function MissingValueHeader(): ReactNode {
  const { t } = useLingui();
  return (
    <Group gap={4} wrap="nowrap">
      <Trans>Missing value</Trans>
      <Tooltip
        label={t`Turn on for values that mean no answer was recorded, such as "Unknown" or 99. Your data isn't changed. The value is marked as missing wherever the dictionary is shown, and Avandar's AI is told it is missing, so it won't treat it as a real answer.`}
      >
        <ActionIcon
          variant="transparent"
          color="neutral"
          size="xs"
          aria-label={t`About missing values`}
        >
          <IconInfoCircle size={14} aria-hidden />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
