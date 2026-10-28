import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/**
 * Slope context and intervention captions remain outside the transport path.
 */
export function ContourLabels({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={input.boundary.slopeLabel} x={45} y={32} width={415} />
      <SceneLabel
        text={input.boundary.periodLabel}
        x={500}
        y={32}
        width={415}
      />
      <SceneLabel text={input.decision.actorLabel} x={45} y={78} width={415} />
      <SceneLabel
        text={input.decision.actionLabel}
        x={500}
        y={78}
        width={415}
      />
      <SceneLabel
        text={input.intervention.label}
        x={365}
        y={430}
        width={540}
        lines={2}
      />
      <SceneLabel
        text={input.copy.boundary}
        x={710}
        y={240}
        width={200}
        lines={3}
      />
    </g>
  );
}
