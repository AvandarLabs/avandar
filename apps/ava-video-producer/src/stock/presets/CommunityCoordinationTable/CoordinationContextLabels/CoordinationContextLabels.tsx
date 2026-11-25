import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Keeps community and scenario copy in the reserved lower rails. */
export function CoordinationContextLabels({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={input.communityLabel}
        x={340}
        y={530}
        width={580}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.scenarioCaption}
        x={40}
        y={579}
        width={880}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
