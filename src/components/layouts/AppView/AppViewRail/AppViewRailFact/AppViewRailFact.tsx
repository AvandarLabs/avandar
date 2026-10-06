import { Text } from "@mantine/core";
import css from "@/components/layouts/AppView/AppViewRail/AppViewRailFact/AppViewRailFact.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The property's name. Kept short: the rail is narrow on purpose. */
  label: ReactNode;

  /** The value. Falls back to an em-less placeholder when absent. */
  children: ReactNode;
};

/**
 * A label and its value, side by side. Values wrap rather than truncate:
 * a date format or a delimiter is unreadable with its tail cut off.
 */
export function AppViewRailFact({
  label,
  children,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.appViewRailFact}>
      <Text component="dt" className={css.appViewRailFactLabel}>
        {label}
      </Text>
      <Text component="dd" className={css.appViewRailFactValue}>
        {children}
      </Text>
    </div>
  );
}
