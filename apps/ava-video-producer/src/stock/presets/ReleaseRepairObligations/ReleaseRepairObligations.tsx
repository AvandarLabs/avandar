import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ReleaseArtifact } from "./ReleaseArtifact";
import { RepairRegister } from "./RepairRegister";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const isHeld = input.issues.some((issue) => {
    return issue.state === "open" && issue.releaseRole === "blocking";
  });
  const artifactX = mix(
    isHeld ? 0 : motion.ramp(frame, 91, motion.scale(39), motion.travel.easing),
    60,
    580,
  );
  return (
    <g>
      <g opacity={motion.reveal(frame, 12)}>
        <StockRect
          data-recipient-bay="true"
          x={550}
          y={88}
          width={350}
          height={322}
          rx={scales.corner(tokens.corner.card)}
          fill="none"
          stroke={tokens.color.line}
          strokeDasharray="6 6"
        />
        <LabelSlots labels={[[input.recipientLabel, 550, 35, 350, 16, 3]]} />
      </g>
      <g opacity={motion.reveal(frame, 12)}>
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
        <SketchedShape
          shape={{ kind: "path", d: "M375 96 h15 v324 h-15" }}
          profile={tokens.sketch.shape}
          data-held-bracket="true"
          stroke={tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
          fill="none"
          opacity={motion.reveal(frame, 91)}
        />
      ) : undefined}
      <g opacity={motion.reveal(frame, 91)}>
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
