import clsx from "clsx";
import css from "@/components/layouts/AppView/AppViewRail/AppViewRail.module.css";
import { AppViewRailFact } from "@/components/layouts/AppView/AppViewRail/AppViewRailFact/AppViewRailFact";
import { AppViewRailGroup } from "@/components/layouts/AppView/AppViewRail/AppViewRailGroup/AppViewRailGroup";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * The stack of property groups that fills an `AppViewBody` rail.
 */
export function AppViewRail({
  children,
  className,
}: Readonly<Props>): ReactNode {
  return <div className={clsx(css.appViewRail, className)}>{children}</div>;
}

AppViewRail.Group = AppViewRailGroup;
AppViewRail.Fact = AppViewRailFact;
