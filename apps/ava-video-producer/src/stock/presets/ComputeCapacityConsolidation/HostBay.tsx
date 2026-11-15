import { propEq, prop } from "@avandar/utils";
import { ramp, mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
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
  const host = input.hosts[index];
  const capacityHeight =
    (host.capacityCpuHours /
      Math.max(...input.hosts.map(prop("capacityCpuHours")))) *
    110;
  const isEmpty = !input.jobs.some(propEq("finalHostId", host.id));
  const fold = isEmpty ? ramp(frame, 108, 12) : 0;
  const x = 55 + index * 215;
  return (
    <g data-host={index} data-host-id={host.id}>
      <StockRect
        data-bay={index}
        x={x}
        y={370 - mix(fold, capacityHeight, 8)}
        width={180}
        height={mix(fold, capacityHeight, 8)}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={1}
        strokeDasharray={isEmpty && frame >= 120 ? "4 4" : undefined}
      />
      {input.showCapacityGuides ? (
        <path
          data-guide={index}
          d={`M${x} ${370 - capacityHeight}h180`}
          stroke={STOCK.muted}
          strokeDasharray="3 4"
        />
      ) : undefined}
      <HostLabels input={input} index={index} frame={frame} />
    </g>
  );
}
