import { CustodyFactMark } from "./CustodyFactMark";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";

type Props = {
  checkpoint: Input["crates"][number]["checkpoints"][number];
  accent: string;
  showMonitoring: boolean;
};
/** A checkpoint keeps monitoring, acknowledgement and seal separate. */
export function CustodyFacts({
  checkpoint,
  accent,
  showMonitoring,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {showMonitoring ? (
        <g data-monitoring={checkpoint.state}>
          <CustodyFactMark
            kind="monitoring"
            value={checkpoint.state}
            x={-20}
            y={0}
            accent={accent}
          />
        </g>
      ) : undefined}
      <g data-ack={checkpoint.acknowledged}>
        <CustodyFactMark
          kind="acknowledgement"
          value={checkpoint.acknowledged}
          x={0}
          y={0}
          accent={accent}
        />
      </g>
      <g data-seal-mark={checkpoint.seal}>
        <CustodyFactMark
          kind="seal"
          value={checkpoint.seal}
          x={21}
          y={0}
          accent={accent}
        />
      </g>
    </g>
  );
}
