import { Tooltip } from "@mantine/core";
import { mantineVar } from "@/lib/utils/browser/css";
import type { TooltipProps } from "@mantine/core";

type Props = TooltipProps;

export function AvaTooltip({ children, ...props }: Props): JSX.Element {
  return (
    <Tooltip
      withArrow
      multiline
      maw={340}
      color="neutral.9"
      fz="md"
      transitionProps={{ transition: "pop" }}
      style={{
        boxShadow: mantineVar("shadow-sm"),
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
}
