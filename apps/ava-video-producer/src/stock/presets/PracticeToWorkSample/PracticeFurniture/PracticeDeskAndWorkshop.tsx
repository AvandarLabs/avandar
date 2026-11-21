import { MeasuredArtifact } from "../MeasuredArtifact/MeasuredArtifact";
import { WorkshopBench } from "../WorkshopBench";
import { PracticeDesk } from "./PracticeDesk";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  transfer: number;
  practiceX: number;
  practiceY: number;
};

/** Renders the practice desk and workshop in authored paint order. */
export function PracticeDeskAndWorkshop(options: Readonly<Props>): ReactNode {
  return (
    <g>
      <PracticeDesk x={options.practiceX - 20} y={options.practiceY + 118} />
      <WorkshopBench transfer={options.transfer} />
      {options.input.showFirstArtifactAtHold || options.frame < 112 ? (
        <MeasuredArtifact
          input={options.input}
          x={options.practiceX}
          y={options.practiceY}
          progress={options.motion.ramp(
            options.frame,
            32,
            options.motion.hero,
            options.motion.travel.easing,
          )}
          isPractice
          accent={options.accent}
        />
      ) : undefined}
      <g opacity={options.transfer}>
        <MeasuredArtifact
          input={options.input}
          x={590}
          y={270}
          progress={options.motion.ramp(
            options.frame,
            90,
            options.motion.hero,
            options.motion.travel.easing,
          )}
          isPractice={false}
          accent={options.accent}
        />
      </g>
    </g>
  );
}
