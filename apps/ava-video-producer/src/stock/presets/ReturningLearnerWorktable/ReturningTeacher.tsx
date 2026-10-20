import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; teacherX: number; handX: number };
/** Draws the ReturningTeacher group with fixed authored geometry. */
export function ReturningTeacher({
  input,
  teacherX,
  handX,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-teacher="true" transform={`translate(${teacherX} 315)`}>
        <PersonGlyph x={0} y={0} size={56} color={STOCK.cyan} />
      </g>
      <path
        data-teacher-hand="true"
        d={`M${teacherX} 315 L${handX + 20} 333 L${handX} 342`}
        fill="none"
        stroke={STOCK.cyan}
        strokeWidth={3}
      />
      <SceneText
        text={input.people.teacher}
        anchor="middle"
        slot={[teacherX, 425, 330, 14, 1]}
      />
    </>
  );
}
