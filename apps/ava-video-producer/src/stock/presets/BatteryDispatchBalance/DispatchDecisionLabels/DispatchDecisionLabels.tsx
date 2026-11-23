import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../BatteryDispatchBalance.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Displays the operator and dispatch decision beside the button. */
export function DispatchDecisionLabels({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={input.decision.actorLabel}
        x={32}
        y={95}
        width={360}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.decision.actionLabel}
        x={550}
        y={95}
        width={378}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
