import { Tooltip } from "@avandar/ui";
import { Badge } from "@mantine/core";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import type { ReactNode } from "react";

type Props = {
  /** The status name, as the case type designer wrote it. */
  name: string;

  /** The status color, a `#rrggbb` string. */
  color: string;

  /** What the status means. Shown in a tooltip on hover and focus when set. */
  description?: string;

  /**
   * Set to `false` when the badge sits inside another control (a menu item,
   * a button) that shows the description itself. A badge with its own
   * tooltip takes keyboard focus so the tooltip can be reached, and a
   * focusable element inside a button is invalid.
   */
  withTooltip?: boolean;
};

/**
 * A status as a badge: the status color as a dot, then the name, on the
 * same neutral badge every other label in the app uses.
 *
 * The badge itself is never filled with the status color. Neutral carries
 * the interface, and a filled yellow or teal badge would also fail text
 * contrast.
 */
export function StatusBadge({
  name,
  color,
  description,
  withTooltip = true,
}: Readonly<Props>): ReactNode {
  const hasTooltip =
    withTooltip && description !== undefined && description !== "";
  const badge = (
    <Badge
      variant="light"
      color="neutral"
      radius="sm"
      size="md"
      tt="none"
      fw={500}
      leftSection={<StatusDot color={color} />}
      tabIndex={hasTooltip ? 0 : undefined}
    >
      {name}
    </Badge>
  );

  return hasTooltip ? (
    <Tooltip label={description} multiline maw={280}>
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}
