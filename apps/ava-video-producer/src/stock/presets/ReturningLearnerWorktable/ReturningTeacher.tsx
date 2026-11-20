import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <g data-teacher="true" transform={`translate(${teacherX} 315)`}>
        <PersonGlyph x={0} y={0} size={56} color={tokens.color.accentAlt} />
      </g>
      <g data-teacher-hand="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${teacherX} 315 L${handX + 20} 333 L${handX} 342`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.accentAlt}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <SceneText
        text={input.people.teacher}
        anchor="middle"
        slot={[teacherX, 425, 330, 14, 1]}
      />
    </>
  );
}
