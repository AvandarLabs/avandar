import { Tooltip, TooltipProps } from "@mantine/core";
import { mantineVar } from "@/lib/utils/browser/css";

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
