import { ramp } from "../../../motion";
import { CustodyFacts } from "./CustodyFacts";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";
type Props = {
  checkpoint: Input["crates"][number]["checkpoints"][number];
  stopIndex: number;
  crateIndex: number;
  y: number;
  frame: number;
  accent: string;
  showMonitoring: boolean;
};
/** Independent tabs attach only when the container reaches each stop. */
export function CustodyCheckpoint({
  checkpoint,
  stopIndex,
  crateIndex,
  y,
  frame,
  accent,
  showMonitoring,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-stop={checkpoint.stopId}
      data-state={checkpoint.state}
      data-acknowledged={checkpoint.acknowledged}
      data-seal={checkpoint.seal}
      opacity={ramp(frame, [22, 60, 101][stopIndex] + crateIndex * 2, 6)}
      transform={`translate(${280 + stopIndex * 230} ${y + 25})`}
    >
      <CustodyFacts
        checkpoint={checkpoint}
        accent={accent}
        showMonitoring={showMonitoring}
      />
    </g>
  );
}
