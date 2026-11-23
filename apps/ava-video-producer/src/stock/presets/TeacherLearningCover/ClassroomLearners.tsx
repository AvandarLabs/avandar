import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneText } from "./SceneText";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Draws the scene's ClassroomLearners group with fixed authored geometry. */
export function ClassroomLearners({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      {input.learners.map((learner, index) => {
        const x = 160 + (index % 3) * 145;
        const y = 335 + Math.floor(index / 3) * 120;
        return (
          <g key={learner.id} data-learner-id={learner.id}>
            <PersonGlyph
              x={x}
              y={y}
              size={44}
              posture="seated"
              color={tokens.color.textMuted}
            />
            <SketchedShape
              shape={{ kind: "path", d: `M${x - 24} ${y + 28} H${x + 24}` }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
              strokeWidth={scales.stroke(tokens.stroke.emphasis)}
            />
            <SceneText
              text={learner.label}
              anchor="middle"
              slot={[x, y + 47, 130, 12, 3]}
            />
          </g>
        );
      })}
    </>
  );
}
