import { Text } from "@mantine/core";
import css from "@/components/layouts/AppView/AppViewRail/AppViewRailGroup/AppViewRailGroup.module.css";
import type { ReactNode } from "react";

type Props = {
  /** What this run of facts is about. One or two words. */
  title?: ReactNode;

  /** A control for the group, aligned to the trailing edge of its label. */
  action?: ReactNode;

  children: ReactNode;
};

/**
 * Groups related facts in a description list, optionally under a heading.
 * Use it, for example, to group related properties in a view rail.
 */
export function AppViewRailGroup({
  title,
  action,
  children,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.appViewRailGroup}>
      {title ? (
        <div className={css.appViewRailGroupHeader}>
          <Text component="h4" className={css.appViewRailGroupTitle}>
            {title}
          </Text>
          {action}
        </div>
      ) : null}
      <dl className={css.appViewRailGroupFacts}>{children}</dl>
    </div>
  );
}
