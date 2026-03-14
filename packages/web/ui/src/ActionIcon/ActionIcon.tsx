import { ActionIcon as MantineActionIcon } from "@mantine/core";
import { Tooltip } from "../Tooltip/Tooltip";
import type { ActionIconProps, TooltipProps } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  tooltip?: ReactNode;
  tooltipProps?: Omit<TooltipProps, "label" | "children">;
} & ActionIconProps &
  React.HTMLAttributes<HTMLElement>;

/**
 * Action icon button with optional tooltip wrapper.
 */
export function ActionIcon({
  tooltip,
  tooltipProps,
  ...props
}: Props): JSX.Element {
  const button = <MantineActionIcon {...props} />;

  return tooltip ? (
    <Tooltip label={tooltip} {...tooltipProps}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
