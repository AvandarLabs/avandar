import { Text } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/layouts/AppListPane/AppListPane.module.css";
import type { ReactNode } from "react";

type Props = {
  /** What the list holds, plural. */
  title: ReactNode;

  /**
   * How many items the list holds. Shown beside the title so the size of the
   * workspace is legible without counting rows.
   */
  count?: number;

  /** A control on the header's trailing edge. */
  action?: ReactNode;

  /**
   * A filter field under the header. Views should withhold it while the list
   * is short enough to scan, so the control appears when it starts to earn
   * its line.
   */
  filter?: ReactNode;

  /** The rows. This is the only part of the pane that scrolls. */
  children: ReactNode;

  className?: string;
};

/**
 * The master pane of a master-detail view: a fixed header naming the list,
 * an optional filter, and a scrolling body of rows.
 *
 * It sits on the tinted body surface with a hairline against the detail
 * region, which is what separates the two rather than a border on a card.
 */
export function AppListPane({
  title,
  count,
  action,
  filter,
  children,
  className,
}: Readonly<Props>): ReactNode {
  return (
    <div className={clsx(css.pane, className)}>
      <div className={css.header}>
        <div className={css.titleRow}>
          <Text component="h3" className={css.title}>
            {title}
          </Text>
          {count === undefined ? null : (
            <Text className={css.count}>{count}</Text>
          )}
          {action ? <div className={css.action}>{action}</div> : null}
        </div>
        {filter ? <div className={css.filter}>{filter}</div> : null}
      </div>
      <div className={css.body}>{children}</div>
    </div>
  );
}
