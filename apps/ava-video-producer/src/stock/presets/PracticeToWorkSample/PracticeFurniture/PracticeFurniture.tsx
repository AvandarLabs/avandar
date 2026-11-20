import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MeasuredArtifact } from "../MeasuredArtifact/MeasuredArtifact";
import { WorkshopBench } from "../WorkshopBench";
import { PracticeDesk } from "./PracticeDesk";
import type { Input } from "../PracticeToWorkSample.schema";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
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
      <PracticeDesk x={practiceX - 20} y={practiceY + 118} />
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
