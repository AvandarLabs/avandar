import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconMapPinPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Turns the coordinate Go-to just flew to into a new place, in one click. */
export function GoToAddPlaceButton({
  onClick,
}: Readonly<{ onClick: () => void }>): ReactNode {
  const { t } = useLingui();
  const label = t`Add a place here`;
  return (
    <Tooltip label={label}>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="neutral"
        aria-label={label}
        onClick={onClick}
      >
        <IconMapPinPlus size={14} stroke={1.6} />
      </ActionIcon>
    </Tooltip>
  );
}
