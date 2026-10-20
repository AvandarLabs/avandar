import { ramp } from "../../../motion";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Authored operator cue precedes the supplied placement. */
export function ComputeHeader({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={input.windowLabel} x={55} y={34} width={400} />
      <SceneLabel
        text={frame < 108 ? input.copy.before : input.copy.after}
        x={500}
        y={34}
        width={400}
      />
      <SceneLabel text={input.decision.actorLabel} x={55} y={70} width={350} />
      <g opacity={ramp(frame, 24, 12)}>
        <SceneLabel
          text={input.decision.actionLabel}
          x={500}
          y={70}
          width={400}
        />
      </g>
    </g>
  );
}
