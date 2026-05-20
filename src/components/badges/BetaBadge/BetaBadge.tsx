import { useLingui } from "@lingui/react/macro";
import { Badge, BadgeProps } from "@mantine/core";
import { Tooltip } from "@ui";
import { mantineVar } from "@/lib/utils/browser/css";

type Props = BadgeProps & {
  /**
   * When false, the badge is shown without the default product-beta tooltip.
   */
  withTooltip?: boolean;
};

/**
 * Small “Beta” badge; optional tooltip explains the product beta state.
 */
export function BetaBadge({
  style,
  withTooltip = true,
  ...props
}: Props): JSX.Element {
  const { t } = useLingui();
  const badge = (
    <Badge
      aria-label={t`Beta`}
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
      <span aria-hidden="true">{t`Beta`}</span>
    </Badge>
  );

  return withTooltip ?
      <Tooltip
        label={t`Avandar is still in beta. Some features may not work as expected and some may still be under construction. We appreciate your patience and feedback as we work to improve the product.`}
      >
        {badge}
      </Tooltip>
    : badge;
}
