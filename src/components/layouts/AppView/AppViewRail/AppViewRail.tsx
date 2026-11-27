import { clsx } from "clsx";
import css from "@/components/layouts/AppView/AppViewRail/AppViewRail.module.css";
import { AppViewRailFact } from "@/components/layouts/AppView/AppViewRail/AppViewRailFact/AppViewRailFact";
import { AppViewRailGroup } from "@/components/layouts/AppView/AppViewRail/AppViewRailGroup/AppViewRailGroup";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps property groups in an app view rail.
 * Use it, for example, to show dataset properties beside view content.
 */
export function AppViewRail({
  children,
  className,
}: Readonly<Props>): ReactNode {
  return <div className={clsx(css.appViewRail, className)}>{children}</div>;
}

AppViewRail.Group = AppViewRailGroup;
AppViewRail.Fact = AppViewRailFact;
