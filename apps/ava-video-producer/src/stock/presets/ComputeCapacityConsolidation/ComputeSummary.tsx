import { prop } from "@avandar/utils";
import { ramp } from "../../../motion";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";
/** Inputs for ComputeSummary. */
type Props = { input: Input; frame: number };

/** Resolved quantities retain their supplied denominator and copy. */
export function ComputeSummary({ input, frame }: Readonly<Props>): ReactNode {
  const total = input.jobs.reduce((sum, job) => sum + job.cpuHours, 0);
  const occupied = new Set(input.jobs.map(prop("finalHostId"))).size;
  return (
    <g>
      <g data-work="total" data-quantity={total}>
        <SceneLabel
          text={`${input.copy.work}: ${total} ${input.copy.unit}`}
          x={55}
          y={532}
          width={425}
        />
      </g>
      <g opacity={ramp(frame, 108, 12)}>
        <SceneLabel
          text={`${input.copy.occupied}: ${occupied} · ${input.copy[input.emptyHostState]}: ${input.hosts.length - occupied}`}
          x={500}
          y={532}
          width={410}
          lines={4}
        />
      </g>
      <SceneLabel
        text={input.copy.disclaimer}
        x={55}
        y={592}
        width={850}
        lines={1}
      />
    </g>
  );
}
