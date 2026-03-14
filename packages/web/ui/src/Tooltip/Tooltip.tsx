import { Tooltip as MantineTooltip } from "@mantine/core";
import css from "./Tooltip.module.css";
import type { TooltipProps } from "@mantine/core";

type Props = TooltipProps;

/**
 * Styled tooltip component with Avandar design defaults.
 */
export function Tooltip({
  children,
  color = "neutral.9",
  fz = "md",
  maw = 340,
  withArrow = true,
  multiline = true,
  transitionProps = { transition: "pop" },
  ...props
}: Props): JSX.Element {
  return (
    <MantineTooltip
      transitionProps={{ transition: "pop", ...transitionProps }}
      className={css.root}
      {...props}
    >
      {children}
    </MantineTooltip>
  );
}
