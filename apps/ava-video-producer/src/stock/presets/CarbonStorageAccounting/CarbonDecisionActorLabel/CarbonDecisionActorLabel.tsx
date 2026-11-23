import { FitText } from "../../../primitives/FitText/FitText";
import type { CarbonStorageAccounting } from "../CarbonStorageAccounting";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof CarbonStorageAccounting>[0]["input"];
};

/** Renders the actor label label with authored geometry. */
export function CarbonDecisionActorLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}
