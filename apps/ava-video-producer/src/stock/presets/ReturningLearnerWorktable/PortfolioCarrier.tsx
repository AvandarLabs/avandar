import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneText } from "./SceneText";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; portfolioOffset: number; accent: string };
/** Draws the PortfolioCarrier group with fixed authored geometry. */
export function PortfolioCarrier({
  input,
  portfolioOffset,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <g
        data-learner="true"
        transform={`translate(${225 + portfolioOffset} 270)`}
      >
        <PersonGlyph x={0} y={0} size={56} color={accent} />
        <g data-portfolio-hand="true">
          <SketchedShape
            shape={{ kind: "path", d: "M0 0 L25 -10 L35 -10" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
        </g>
      </g>
      <SceneText
        text={input.people.learner}
        anchor="middle"
        slot={[170 + portfolioOffset, 193, 170, 14, 3]}
      />
      <g data-portfolio-base="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${260 + portfolioOffset} 288 H${300 + (input.priorWork.length - 1) * 50 + portfolioOffset}`,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
    </>
  );
}
