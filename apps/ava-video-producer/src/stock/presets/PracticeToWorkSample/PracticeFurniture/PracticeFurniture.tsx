import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PracticeDeskAndWorkshop } from "./PracticeDeskAndWorkshop";
import type { Input } from "../PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

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
  const practiceX = Motion.mix({
    t: transfer,
    from: 370,
    to: 100,
  });
  const practiceY = Motion.mix({
    t: transfer,
    from: 270,
    to: 320,
  });
  return (
    <PracticeDeskAndWorkshop
      input={input}
      frame={frame}
      accent={accent}
      motion={motion}
      transfer={transfer}
      practiceX={practiceX}
      practiceY={practiceY}
    />
  );
}
