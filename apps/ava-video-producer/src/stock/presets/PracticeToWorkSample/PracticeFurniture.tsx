import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { MeasuredArtifact } from "./MeasuredArtifact";
import { WorkshopBench } from "./WorkshopBench";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Furniture changes around the retained learner and measured practice sheet.
 */
export function PracticeFurniture({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const transfer = motion.ramp(
    frame,
    56,
    motion.scale(22),
    motion.travel.easing,
  );
  const practiceX = mix(transfer, 370, 100);
  const practiceY = mix(transfer, 270, 320);
  return (
    <g>
      <g
        data-practice-desk="true"
        transform={`translate(${practiceX - 20} ${practiceY + 118})`}
      >
        <SketchedShape
          shape={{ kind: "path", d: "M0 0 H260 M20 0 V55 M240 0 V55" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(6)}
        />
      </g>
      <WorkshopBench transfer={transfer} />
      {input.showFirstArtifactAtHold || frame < 112 ? (
        <MeasuredArtifact
          input={input}
          x={practiceX}
          y={practiceY}
          progress={motion.ramp(frame, 32, motion.hero, motion.travel.easing)}
          isPractice
          accent={accent}
        />
      ) : undefined}
      <g opacity={transfer}>
        <MeasuredArtifact
          input={input}
          x={590}
          y={270}
          progress={motion.ramp(frame, 90, motion.hero, motion.travel.easing)}
          isPractice={false}
          accent={accent}
        />
      </g>
    </g>
  );
}
