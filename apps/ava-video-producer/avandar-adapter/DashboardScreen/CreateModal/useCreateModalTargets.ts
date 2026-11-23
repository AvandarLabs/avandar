import { useLayoutEffect, useRef } from "react";
import { Motion } from "../../../src/motion";
import { DASHBOARD_NAME } from "../../shims/import-dashboard/DashboardFixtureContext";
import type { RefObject } from "react";
/** Track typed form targets and restore the insertion point after remounts. */
export function useCreateModalTargets({ frame }: Readonly<{ frame: number }>): {
  rootRef: RefObject<HTMLDivElement | null>;
  name: string;
} {
  const rootRef = useRef<HTMLDivElement>(null);
  const name = Motion.typed({
    frame,
    at: 148,
    text: DASHBOARD_NAME,
    cps: 27,
  });
  useLayoutEffect(function markCreateModalVideoTargets() {
    const input = rootRef.current?.querySelector("input");
    input?.setAttribute("data-video-target", "dashboard-name");
    // The genuine create form selects its default name on focus. Each frame's
    // controlled remount supplies the next typed value, then restores the
    // normal insertion point so completed text does not stay selected.
    input?.setSelectionRange(name.length, name.length);
    [...(rootRef.current?.querySelectorAll("button") ?? [])]
      .find((button) => {
        return button.textContent?.includes("Create dashboard");
      })
      ?.setAttribute("data-video-target", "dashboard-create");
  });
  return { rootRef, name };
}
