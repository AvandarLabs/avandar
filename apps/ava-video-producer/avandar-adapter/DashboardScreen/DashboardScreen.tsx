import { useMemo } from "react";
import "@puckeditor/core/puck.css";
import { DashboardFixtureContext } from "../shims/import-dashboard/DashboardFixtureContext";
import { CreateModal } from "./CreateModal/CreateModal";
import css from "./DashboardScreen.module.css";
import { DashboardTransition } from "./DashboardTransition";
import { SourceChart } from "./SourceChart/SourceChart";
import type { ReactNode } from "react";

type Props = { frame: number; width: number; height: number };
/** Duration of the dashboard reenactment, in frames. */
export const DASHBOARD_DURATION = 720;
/** Measured pointer targets and click frames for the dashboard film. */
export const DASHBOARD_BEATS = [
  { frame: 48, target: "dashboard-save-menu", action: "click" },
  { frame: 92, target: "dashboard-save-option", action: "click" },
  { frame: 144, target: "dashboard-name", action: "click" },
  { frame: 300, target: "dashboard-create", action: "click" },
  { frame: 456, target: "dashboard-view", action: "click" },
] as const;
/**
 * Actual Avandar Puck configuration, chart card, save form and preview banner.
 * Frame controls only the fixture state and deterministic presentation timing.
 */
export function DashboardScreen({
  frame,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const context = useMemo(() => {
    return { frame, chartAt: 328 };
  }, [frame]);
  return (
    <DashboardFixtureContext.Provider value={context}>
      <div
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
          background: "var(--ava-surface-raised)",
        }}
      >
        {frame < 346 ? (
          <div className={css.dashboardScreenPhaseLayerBase}>
            <SourceChart frame={Math.min(frame, 327)} />
            {frame >= 101 ? <CreateModal frame={Math.min(frame, 327)} /> : null}
          </div>
        ) : null}
        <DashboardTransition frame={frame} height={height} />
      </div>
    </DashboardFixtureContext.Provider>
  );
}
export { DashboardScreen as Screen };
