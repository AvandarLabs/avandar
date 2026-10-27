import { ClassroomLearners } from "./ClassroomLearners";
import { CoverStaff } from "./CoverStaff";
import { getCoverPositionsFromFrame } from "./getCoverPositionsFromFrame";
import { LearningRooms } from "./LearningRooms";
import { MentorBoard } from "./MentorBoard";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Keeps the fixed class physically attended across both teacher handoffs. */
export function TeacherLearningCover({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const positions = getCoverPositionsFromFrame(frame);
  const responsibleX =
    frame >= 42 && frame < 124 ? positions.coverX : positions.teacherX;
  return (
    <g>
      <LearningRooms input={input} />
      {(["teacher", "cover", "mentor"] as const).map((role) => (
        <CoverStaff
          key={role}
          role={role}
          person={input.staff[role]}
          x={positions[`${role}X`]}
          frame={frame}
          mode={input.session.mode}
          accent={accent}
        />
      ))}
      <ClassroomLearners input={input} />
      {input.showClassroomResponsibility ? (
        <path
          data-responsibility="true"
          d={`M${responsibleX} 282 V299 H305 V307`}
          fill="none"
          stroke={accent}
          strokeWidth={2}
        />
      ) : undefined}
      <MentorBoard input={input} frame={frame} />
    </g>
  );
}
