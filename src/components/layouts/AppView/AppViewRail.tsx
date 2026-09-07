import { Text } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/layouts/AppView/AppViewRail.module.css";
import type { ReactNode } from "react";

type RailProps = {
  children: ReactNode;
  className?: string;
};

type GroupProps = {
  /** What this run of facts is about. One or two words. */
  title?: ReactNode;

  /** A control for the group, aligned to the trailing edge of its label. */
  action?: ReactNode;

  children: ReactNode;
};

type FactProps = {
  /** The property's name. Kept short: the rail is narrow on purpose. */
  label: ReactNode;

  /** The value. Falls back to an em-less placeholder when absent. */
  children: ReactNode;
};

/**
 * The stack of property groups that fills an `AppViewBody` rail.
 */
export function AppViewRail({
  children,
  className,
}: Readonly<RailProps>): ReactNode {
  return <div className={clsx(css.rail, className)}>{children}</div>;
}

/**
 * One run of related facts under a small label.
 */
function AppViewRailGroup({
  title,
  action,
  children,
}: Readonly<GroupProps>): ReactNode {
  return (
    <div className={css.group}>
      {title ? (
        <div className={css.groupHeader}>
          <Text component="h4" className={css.groupTitle}>
            {title}
          </Text>
          {action}
        </div>
      ) : null}
      <dl className={css.facts}>{children}</dl>
    </div>
  );
}

/**
 * A label and its value, side by side. Values wrap rather than truncate:
 * a date format or a delimiter is unreadable with its tail cut off.
 */
function AppViewRailFact({ label, children }: Readonly<FactProps>): ReactNode {
  return (
    <div className={css.fact}>
      <Text component="dt" className={css.factLabel}>
        {label}
      </Text>
      <Text component="dd" className={css.factValue}>
        {children}
      </Text>
    </div>
  );
}

AppViewRail.Group = AppViewRailGroup;
AppViewRail.Fact = AppViewRailFact;
