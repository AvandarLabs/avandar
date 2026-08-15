import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = { layerName: string; isVisible: boolean; onClick: () => void };

/** Toggles a layer's visibility from its row. */
export function LayerVisibilityButton(props: Props): ReactNode {
  const { t } = useLingui();
  return (
    <ActionIcon
      variant="subtle"
      color="neutral"
      size="sm"
      aria-pressed={props.isVisible}
      aria-label={
        props.isVisible ?
          t`Hide the layer ${props.layerName}`
        : t`Show the layer ${props.layerName}`
      }
      onClick={props.onClick}
    >
      {props.isVisible ?
        <IconEye size={15} stroke={1.5} />
      : <IconEyeOff size={15} stroke={1.5} />}
    </ActionIcon>
  );
}
