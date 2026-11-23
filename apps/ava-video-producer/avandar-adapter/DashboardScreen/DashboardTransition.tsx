import { Motion } from "../../src/motion";
import { DashboardCanvas } from "./DashboardCanvas";
import type { ReactNode } from "react";

type Props = { frame: number; height: number };
/**
 * Crossfade editor and preview at the authored frames without changing keys.
 */
export function DashboardTransition({
  frame,
  height,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {frame >= 328 && frame < 492 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "var(--ava-surface-raised)",
            opacity: Motion.ramp({
              frame,
              at: 328,
              dur: 18,
            }),
          }}
        >
          <DashboardCanvas isPreview={false} height={height} />
        </div>
      ) : null}
      {frame >= 474 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            opacity: Motion.ramp({
              frame,
              at: 474,
              dur: 18,
            }),
            background: "var(--ava-surface-raised)",
          }}
        >
          <DashboardCanvas isPreview height={height} />
        </div>
      ) : null}
    </>
  );
}
