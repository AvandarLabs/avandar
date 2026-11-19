import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
  useGraphicMotion,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ClassroomLearners } from "./ClassroomLearners";
import { CoverStaff } from "./CoverStaff";
import { getCoverPositionsFromFrame } from "./getCoverPositionsFromFrame";
import { LearningRooms } from "./LearningRooms";
import { MentorBoard } from "./MentorBoard";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Keeps the fixed class physically attended across both teacher handoffs. */
export function TeacherLearningCover({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const positions = getCoverPositionsFromFrame(frame, motion);
  const responsibleX =
    frame >= 42 && frame < 124 ? positions.coverX : positions.teacherX;
  return (
    <g>
      <LearningRooms input={input} />
      {(["teacher", "cover", "mentor"] as const).map((role) => {
        return (
          <CoverStaff
            key={role}
            role={role}
            person={input.staff[role]}
            x={positions[`${role}X`]}
            frame={frame}
            mode={input.session.mode}
            accent={accent}
          />
        );
      })}
      <ClassroomLearners input={input} />
      {input.showClassroomResponsibility ? (
        <g data-responsibility="true">
          <SketchedShape
            shape={{ kind: "path", d: `M${responsibleX} 282 V299 H305 V307` }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
        </g>
      ) : undefined}
      <MentorBoard input={input} frame={frame} />
    </g>
  );
}
