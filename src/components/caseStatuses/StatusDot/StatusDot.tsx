import clsx from "clsx";
import css from "@/components/caseStatuses/StatusDot/StatusDot.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The status color, a `#rrggbb` string. */
  color: string;

  /**
   * The status name. Set it when the dot stands alone, such as on a records
   * list row, so the dot is announced by it. Leave it unset when the name is
   * already written beside the dot.
   */
  label?: string;

  /** `md` for a swatch someone clicks, `sm` (the default) beside a name. */
  size?: "sm" | "md";

  className?: string;
};

/**
 * A small square of a status's color.
 *
 * A status keeps its color to this mark rather than filling a badge with it,
 * so the interface stays neutral and every status name reads at the same
 * contrast whatever color the case type designer picked.
 */
export function StatusDot({
  color,
  label,
  size = "sm",
  className,
}: Readonly<Props>): ReactNode {
  return (
    <span
      className={clsx(css.statusDot, className)}
      data-size={size}
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
      // The color is data the user chose, so it cannot live in the
      // stylesheet.
      style={{ backgroundColor: color }}
    />
  );
}
