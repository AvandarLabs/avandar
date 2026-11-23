import { SketchedShape } from "../../primitives/SketchedShape";
import type { ScanBeamData } from "./ScanLines.types";
import type { ReactNode } from "react";

type Props = ScanBeamData;

/** Renders the scan beam layer for ScanLines. */
export function ScanBeam(options: Readonly<Props>): ReactNode {
  return (
    <g clipPath={`url(#${options.id}-scan-clip)`}>
      <rect
        x={153}
        y={options.scanY - 67}
        width={691}
        height={67}
        fill={`url(#${options.id}-scan)`}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M153 ${options.scanY} H844` }}
        profile={options.sketch.shape}
        stroke={options.accent}
        strokeWidth={options.shapes.stroke(options.stroke.outline)}
      />
    </g>
  );
}
