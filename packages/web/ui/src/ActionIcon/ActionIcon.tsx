import { ActionIcon as MantineActionIcon } from "@mantine/core";
import clsx from "clsx";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import css from "@ui/ActionIcon/ActionIcon.module.css";
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
  const iconButton = (
    <MantineActionIcon className={clsx(css.root, props.className)} {...props} />
  );

  return tooltip ?
      <Tooltip label={tooltip} {...tooltipProps}>
        {iconButton}
      </Tooltip>
    : iconButton;
}
