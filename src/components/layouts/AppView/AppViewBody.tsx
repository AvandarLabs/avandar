import { useMediaQuery } from "@mantine/hooks";
import clsx from "clsx";
import css from "@/components/layouts/AppView/AppViewBody.module.css";
import type { ReactNode } from "react";

/**
 * Above this width the rail is a column beside the content. Below it, the
 * rail's contents flow underneath the content instead, because a third
 * column and a readable main column cannot both fit.
 */
const RAIL_AS_COLUMN_QUERY = "(min-width: 75em)";

type Props = {
  children: ReactNode;

  /**
   * Properties and facts about what the content shows. Rendered as a rail on
   * the trailing edge on wide screens and beneath the content on narrow
   * ones. This is for information and view-scoped navigation, never for a
   * second set of app navigation.
   */
  rail?: ReactNode;

  /**
   * Caps the content column's measure. Set it for views that are mostly
   * prose; leave it off for anything holding a table or a grid, which should
   * use every pixel it is given.
   */
  contentMaxWidth?: number;

  /** Drops the content gutter, for a view that paints edge to edge. */
  noPadding?: boolean;

  className?: string;
};

/**
 * The scrolling region under an `AppViewHeader`, optionally flanked by a
 * properties rail.
 *
 * The content column and the rail scroll independently, so reading a long
 * list of columns never scrolls the facts about the record out of reach.
 */
export function AppViewBody({
  children,
  rail,
  contentMaxWidth,
  noPadding = false,
  className,
}: Readonly<Props>): ReactNode {
  const isRailAColumn = useMediaQuery(RAIL_AS_COLUMN_QUERY, true);
  const hasSideRail = rail !== undefined && isRailAColumn;

  return (
    <div className={clsx(css.body, className)}>
      <div className={css.scroller}>
        <div
          className={clsx(css.content, noPadding && css.contentNoPadding)}
          style={
            contentMaxWidth === undefined
              ? undefined
              : { maxWidth: contentMaxWidth }
          }
        >
          {children}
        </div>
        {rail !== undefined && !isRailAColumn ? (
          <div className={css.stackedRail}>{rail}</div>
        ) : null}
      </div>
      {hasSideRail ? <aside className={css.rail}>{rail}</aside> : null}
    </div>
  );
}
