import { ActionIcon as MantineActionIcon } from "@mantine/core";
import { AvaTooltip } from "@/lib/ui/AvaTooltip/AvaTooltip";
import type { ActionIconProps, TooltipProps } from "@mantine/core";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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
