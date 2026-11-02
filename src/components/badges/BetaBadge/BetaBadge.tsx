import { mantineVar, Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Badge, BadgeProps } from "@mantine/core";

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
      // A span, not Badge's default div. Its only caller sets it inside a
      // sentence, and that sentence is a paragraph: a div there is invalid
      // HTML and React reports it as a hydration error.
      component="span"
      color="warning.5"
      c="neutral.9"
      fw={700}
      px="xs"
      lts="0.25em"
      style={{
        // `xs` is the documented step for something this small. `lg` is a
        // reserved tier, and spending it on the least elevated element in the
        // view inverts the scale it belongs to.
        boxShadow: mantineVar("shadow-xs"),
        ...style,
      }}
      {...props}
    >
      <span aria-hidden="true">{t`Beta`}</span>
    </Badge>
  );

  return withTooltip ? (
    <Tooltip
      label={t`Avandar is still in beta. Some features may not work as expected and some may still be under construction. We appreciate your patience and feedback as we work to improve the product.`}
    >
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}
