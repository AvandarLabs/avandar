import { EASE, mix, ramp } from "../../../motion";
import { STOCK, type GraphicProps } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ReleaseArtifact } from "./ReleaseArtifact";
import { RepairRegister } from "./RepairRegister";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/**
 * A physical release gate preserves every unresolved limitation and commitment.
 */
export function ReleaseRepairObligations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const isHeld = input.issues.some(
    (issue) => issue.state === "open" && issue.releaseRole === "blocking",
  );
  const artifactX = mix(isHeld ? 0 : ramp(frame, 91, 39, EASE.inOut), 60, 580);
  return (
    <g>
      <g opacity={ramp(frame, 12, 12)}>
        <rect
          data-recipient-bay="true"
          x={550}
          y={88}
          width={350}
          height={322}
          rx={12}
          fill="none"
          stroke={STOCK.line}
          strokeDasharray="6 6"
        />
        <LabelSlots labels={[[input.recipientLabel, 550, 35, 350, 16, 3]]} />
      </g>
      <g opacity={ramp(frame, 12, 12)}>
        <LabelSlots
          labels={[
            [input.labels.resolved, 60, 35, 200, 12, 3],
            [input.labels.open, 300, 35, 200, 12, 3],
          ]}
        />
      </g>
      <ReleaseArtifact
        input={input}
        frame={frame}
        accent={accent}
        artifactX={artifactX}
      />
      <RepairRegister
        input={input}
        frame={frame}
        accent={accent}
        artifactX={artifactX}
      />
      {isHeld ? (
        <path
          data-held-bracket="true"
          d="M375 96 h15 v324 h-15"
          stroke={STOCK.orange}
          strokeWidth={4}
          fill="none"
          opacity={ramp(frame, 91, 12)}
        />
      ) : undefined}
      <g opacity={ramp(frame, 91, 12)}>
        <LabelSlots
          labels={[
            [
              isHeld ? input.labels.held : input.labels.ready,
              60,
              92,
              440,
              14,
              2,
            ],
          ]}
        />
      </g>
      <LabelSlots labels={[[input.labels.example, 60, 596, 840, 12, 1]]} />
    </g>
  );
}
