import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
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
  return (
    <>
      <g
        data-learner="true"
        transform={`translate(${225 + portfolioOffset} 270)`}
      >
        <PersonGlyph x={0} y={0} size={56} color={accent} />
        <path
          data-portfolio-hand="true"
          d="M0 0 L25 -10 L35 -10"
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      </g>
      <SceneText
        text={input.people.learner}
        anchor="middle"
        slot={[170 + portfolioOffset, 193, 170, 14, 3]}
      />
      <path
        data-portfolio-base="true"
        d={`M${260 + portfolioOffset} 288 H${300 + (input.priorWork.length - 1) * 50 + portfolioOffset}`}
        stroke={accent}
        strokeWidth={3}
      />
    </>
  );
}
