import { ramp } from "../../../motion";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ReactNode } from "react";

type Props = { layout: Input["layout"]; frame: number; accent: string };
/** Alignment extends from the featured slot, then withdraws after docking. */
export function DashboardGuides({
  layout,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 48, 16);
  const guide =
    layout === "feature-left"
      ? { x1: 426, x2: 426, y1: 132, y2: 132 + 444 * progress }
      : { x1: 24, x2: 24 + 912 * progress, y1: 336, y2: 336 };
  const appearance = {
    opacity: ramp(frame, 48, 12) * (1 - ramp(frame, 112, 18)),
    stroke: accent,
    strokeWidth: 1,
    strokeDasharray: "5 7",
  };
  return (
    <g data-alignment-guides="temporary" {...appearance}>
      <line {...guide} />
    </g>
  );
}
