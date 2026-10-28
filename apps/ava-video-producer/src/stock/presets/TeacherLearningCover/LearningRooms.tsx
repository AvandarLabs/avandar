import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Draws the scene's LearningRooms group with fixed authored geometry. */
export function LearningRooms({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <SceneText
        text={input.roomLabels.classroom}
        anchor="middle"
        slot={[305, 57, 440, 18, 2]}
      />
      <SceneText
        text={input.roomLabels.supportSpace}
        anchor="middle"
        slot={[750, 57, 340, 18, 3]}
      />
      <path
        data-classroom-outline="true"
        d="M90 210 V200 H530 V210 M530 305 V548 H90 V305"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <path
        d="M570 210 V200 H930 V548 H570 V305"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
    </>
  );
}
