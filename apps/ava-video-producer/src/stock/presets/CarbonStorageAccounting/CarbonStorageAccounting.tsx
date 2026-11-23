import { FitText } from "../../primitives/FitText/FitText";
import { CarbonAccounting } from "./CarbonAccounting";
import { CarbonBoundaryLabel } from "./CarbonBoundaryLabel/CarbonBoundaryLabel";
import { CarbonDecisionActionLabel } from "./CarbonDecisionActionLabel/CarbonDecisionActionLabel";
import { CarbonDecisionActorLabel } from "./CarbonDecisionActorLabel/CarbonDecisionActorLabel";
import { CarbonPhysical } from "./CarbonPhysical";
import { DEFAULT_INPUT } from "./CarbonStorageAccounting.fixtures";
import { CarbonStorageAccountingDisclaimerLabel } from "./CarbonStorageAccountingDisclaimerLabel/CarbonStorageAccountingDisclaimerLabel";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
        <CarbonBoundaryLabel input={input} />
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
      <CarbonDecisionActorLabel input={input} />
      <CarbonDecisionActionLabel input={input} />
      <CarbonPhysical {...{ input, frame, accent }} />
      <CarbonAccounting {...{ input, frame, accent }} />
      <CarbonStorageAccountingDisclaimerLabel input={input} />
    </g>
  );
}
