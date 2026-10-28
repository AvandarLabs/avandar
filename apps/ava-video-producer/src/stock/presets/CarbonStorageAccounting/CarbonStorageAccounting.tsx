import { type GraphicProps } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { CarbonAccounting } from "./CarbonAccounting";
import { CarbonPhysical } from "./CarbonPhysical";
import { DEFAULT_INPUT } from "./CarbonStorageAccounting.fixtures";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Physical retained mass and signed CO2e accounting share an explicit boundary.
 */
export function CarbonStorageAccounting({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <g data-boundary>
        <FitText
          text={input.boundary.label}
          x={50}
          y={46}
          width={860}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
        <FitText
          text={input.boundary.periodLabel}
          x={50}
          y={78}
          width={860}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
        <FitText
          text={input.boundary.includedActivities}
          x={50}
          y={110}
          width={860}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <FitText
        text={input.decision.actorLabel}
        x={50}
        y={152}
        width={450}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.decision.actionLabel}
        x={50}
        y={188}
        width={450}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <CarbonPhysical input={input} frame={frame} accent={accent} />
      <CarbonAccounting input={input} frame={frame} accent={accent} />
      <FitText
        text={input.copy.disclaimer}
        x={50}
        y={585}
        width={870}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
