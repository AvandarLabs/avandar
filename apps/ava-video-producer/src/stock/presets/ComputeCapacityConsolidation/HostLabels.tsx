import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number };
/** Capacity and idle-state captions stay outside all work paths. */
export function HostLabels({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const host = input.hosts[index];
  const x = 55 + index * 215;
  const isEmpty = !input.jobs.some(propEq("finalHostId", host.id));
  const fold = isEmpty ? ramp(frame, 108, 12) : 0;
  return (
    <g>
      <SceneLabel text={host.label} x={x} y={386} width={180} lines={3} />
      <SceneLabel
        text={String(host.capacityCpuHours)}
        x={x + 110}
        y={366}
        width={65}
        lines={2}
      />
      {isEmpty && frame >= 108 ? (
        <g opacity={fold}>
          <SceneLabel
            text={input.copy[input.emptyHostState]}
            x={x}
            y={285}
            width={180}
            lines={4}
          />
        </g>
      ) : undefined}
    </g>
  );
}
