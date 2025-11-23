import { Badge, BadgeProps, Tooltip } from "@mantine/core";
import { mantineVar } from "@/lib/utils/browser/css";

type Props = BadgeProps;

export function BetaBadge({ style, ...props }: Props): JSX.Element {
  return (
    <Tooltip
      multiline
      maw={340}
      fz="md"
      label="Avandar is still in beta. Some features may not work as expected and some may still be under construction. We appreciate your patience and feedback as we work around the clock to improve the product."
      transitionProps={{ transition: "pop" }}
    >
      <Badge
        color="warning.5"
        c="dark.9"
        fw={700}
        px="xs"
        lts="0.25em"
        style={{
          zIndex: 9999,
          boxShadow: mantineVar("shadow-lg"),
          ...style,
        }}
        {...props}
      >
        Beta
      </Badge>
    </Tooltip>
  );
}
