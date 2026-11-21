import { propEq, prop } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HostLabels } from "../HostLabels";
import { CapacityGuide } from "./CapacityGuide";
import type { Input } from "../ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
};
/** A common capacity scale persists while truly empty hosts fold. */
export function HostBay({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const host = input.hosts[index];
  const capacityHeight =
    (host.capacityCpuHours /
      Math.max(...input.hosts.map(prop("capacityCpuHours")))) *
    110;
  const isEmpty = !input.jobs.some(propEq("finalHostId", host.id));
  const fold = isEmpty ? motion.reveal(frame, 108) : 0;
  const x = 55 + index * 215;
  return (
    <g data-host={index} data-host-id={host.id}>
      <StockRect
        data-bay={index}
        x={x}
        y={370 - Motion.mix({ t: fold, from: capacityHeight, to: 8 })}
        width={180}
        height={Motion.mix({ t: fold, from: capacityHeight, to: 8 })}
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
      <HostLabels {...{ input, index, frame }} />
    </g>
  );
}
