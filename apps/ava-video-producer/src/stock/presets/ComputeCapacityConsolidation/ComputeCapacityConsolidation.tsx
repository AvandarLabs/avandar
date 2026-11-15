import { ComputeHeader } from "./ComputeHeader";
import { ComputeSummary } from "./ComputeSummary";
import { HostBay } from "./HostBay";
import { WorkBlocks } from "./WorkBlocks";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";
/** Explicit content joins the shared stock frame contract. */
export type Props = GraphicProps & { input: Input };
/** Supplied placements move whole jobs without inferring energy savings. */
export function ComputeCapacityConsolidation({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ComputeHeader input={input} frame={frame} />
      {input.hosts.map((host, index) => (
        <HostBay
          key={host.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <WorkBlocks input={input} frame={frame} />
      <ComputeSummary input={input} frame={frame} />
    </g>
  );
}
