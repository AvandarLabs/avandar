import { propEq, prop } from "@avandar/utils";
import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { HostLabels } from "./HostLabels";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** A common capacity scale persists while truly empty hosts fold. */
export function HostBay({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const host = input.hosts[index];
  const capacityHeight = _getCapacityHeight(input, host);
  const isEmpty = !input.jobs.some(propEq("finalHostId", host.id));
  const fold = isEmpty ? motion.reveal(frame, 108) : 0;
  const x = 55 + index * 215;
  return (
    <g data-host={index} data-host-id={host.id}>
      <StockRect
        data-bay={index}
        x={x}
        y={370 - mix(fold, capacityHeight, 8)}
        width={180}
        height={mix(fold, capacityHeight, 8)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        strokeDasharray={
          isEmpty && frame >= 120 ? atomic.dash.even.join(" ") : undefined
        }
      />
      {input.showCapacityGuides ? (
        <CapacityGuide index={index} x={x} y={370 - capacityHeight} />
      ) : undefined}
      <HostLabels input={input} index={index} frame={frame} />
    </g>
  );
}

/** A host's capacity on the scale shared by every bay, up to 110 pixels. */
function _getCapacityHeight(
  input: Input,
  host: Input["hosts"][number],
): number {
  return (
    (host.capacityCpuHours /
      Math.max(...input.hosts.map(prop("capacityCpuHours")))) *
    110
  );
}

/** A dashed guide at the host's full capacity, kept while the bay folds. */
function CapacityGuide({
  index,
  x,
  y,
}: Readonly<{ index: number; x: number; y: number }>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} ${y}h180` }}
      profile={tokens.sketch.shape}
      data-guide={index}
      stroke={tokens.color.inactive}
      strokeDasharray={atomic.dash.short.join(" ")}
    />
  );
}
