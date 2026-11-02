import clsx from "clsx";
import css from "@/components/layouts/AppView/AppView.module.css";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * The frame every app view inside the slate is built on: a full-height
 * column holding an `AppViewHeader` band and an `AppViewBody`.
 *
 * It paints the lit content surface the rest of the system reads against.
 * The list pane on one side and the properties rail on the other both sit
 * on the tinted body surface, so the view a user is working in is the only
 * white region on screen. That contrast is what replaces the nested `Paper`
 * layers this frame exists to remove: structure comes from hairlines and a
 * single tonal step, never from stacking bordered boxes.
 */
export function AppView({ children, className }: Readonly<Props>): ReactNode {
  return <div className={clsx(css.appView, className)}>{children}</div>;
}
