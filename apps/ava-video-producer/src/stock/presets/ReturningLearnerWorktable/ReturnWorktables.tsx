import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** The dash of the portfolio trail across the worktables. */
const PORTFOLIO_TRAIL_DASH = "3 7";
type Props = { showPortfolioTrail: boolean; accent: string };
/** Two work surfaces retain the portfolio through its visible journey. */
export function ReturnWorktables({
  showPortfolioTrail,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M245 295 H590 M255 295 V405 M580 295 V405 M245 392 H590 M755 295 H920 M765 295 V400 M910 295 V400",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {showPortfolioTrail ? (
        <g data-portfolio-trail="true">
          <SketchedShape
            shape={{ kind: "path", d: "M390 172 H860" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeDasharray={PORTFOLIO_TRAIL_DASH}
            opacity={tokens.alpha.guide}
          />
        </g>
      ) : undefined}
    </>
  );
}
