import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = { layerName: string; isVisible: boolean; onClick: () => void };

/** Toggles a layer's visibility from its row. */
export function LayerVisibilityButton({
  layerName,
  isVisible,
  onClick,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <ActionIcon
      variant="subtle"
      color="neutral"
      size="sm"
      aria-pressed={isVisible}
      aria-label={
        isVisible
          ? t`Hide the layer ${layerName}`
          : t`Show the layer ${layerName}`
      }
      onClick={onClick}
    >
      {isVisible ? (
        <IconEye size={15} stroke={1.5} />
      ) : (
        <IconEyeOff size={15} stroke={1.5} />
      )}
    </ActionIcon>
  );
}
