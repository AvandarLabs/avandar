import { ActionIcon as MantineActionIcon } from "@mantine/core";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { AvaTooltip } from "../AvaTooltip";
import type { ActionIconProps, TooltipProps } from "@mantine/core";

type Props = {
  tooltip?: ReactNode;
  tooltipProps?: Omit<TooltipProps, "label" | "children">;
} & ActionIconProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

export function ActionIcon({
  tooltip,
  tooltipProps,
  ...props
}: Props): JSX.Element {
  return (
    <AvaTooltip label={tooltip} {...tooltipProps}>
      <MantineActionIcon {...props} />
    </AvaTooltip>
  );
}
