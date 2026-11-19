import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneText } from "./SceneText";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Draws the scene's LearningRooms group with fixed authored geometry. */
export function LearningRooms({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      <g data-classroom-outline="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: "M90 210 V200 H530 V210 M530 305 V548 H90 V305",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: "M570 210 V200 H930 V548 H570 V305" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </>
  );
}
