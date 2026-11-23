import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Displays the authored caption below the access scene. */
export function ServiceAccessCaption({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={input.scenarioCaption}
        x={50}
        y={577}
        width={860}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
