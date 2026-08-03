import { Badge, BadgeProps } from "@mantine/core";
import { mantineVar, Tooltip } from "@ui";

type Props = BadgeProps & {
  /**
   * When false, the badge is shown without the default product-beta tooltip.
   */
  withTooltip?: boolean;
};

const _BETA_TOOLTIP_LABEL =
  "Avandar is still in beta. Some features may not work as expected and some may still be under construction. We appreciate your patience and feedback as we work to improve the product.";

/**
 * Small “Beta” badge; optional tooltip explains the product beta state.
 */
export function BetaBadge({
  style,
  withTooltip = true,
  ...props
}: Props): JSX.Element {
  const badge = (
    <Badge
      aria-label="Beta"
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
      <span aria-hidden="true">Beta</span>
    </Badge>
  );

  return withTooltip ?
      <Tooltip label={_BETA_TOOLTIP_LABEL}>{badge}</Tooltip>
    : badge;
}
