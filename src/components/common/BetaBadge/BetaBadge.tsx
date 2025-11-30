import { Badge, BadgeProps } from "@mantine/core";
import { AvaTooltip } from "@/lib/ui/AvaTooltip";
import { mantineVar } from "@/lib/utils/browser/css";

type Props = BadgeProps;

export function BetaBadge({ style, ...props }: Props): JSX.Element {
  return (
    <AvaTooltip label="Avandar is still in beta. Some features may not work as expected and some may still be under construction. We appreciate your patience and feedback as we work to improve the product.">
      <Badge
        color="warning.5"
        c="dark.9"
        fw={700}
        px="xs"
        lts="0.25em"
        style={{
          zIndex: 9999,
          boxShadow: mantineVar("shadow-lg"),
          // not very performant but it's only a small badge so it's okay
          transition: "all 0.3s ease-in-out",
          ...style,
        }}
        {...props}
      >
        Beta
      </Badge>
    </AvaTooltip>
  );
}
