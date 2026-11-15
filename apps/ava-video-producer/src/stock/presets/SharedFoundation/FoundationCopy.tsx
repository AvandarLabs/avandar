import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";
/** Inputs for FoundationCopy. */
type Props = { input: Input };

/** One shared phrase remains intact as the foundation sections are exposed. */
export function FoundationCopy({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={input.foundationLabel}
        x={480}
        y={420}
        width={760}
        fontSize={16}
        maxLines={1}
        anchor="middle"
        color={STOCK.mint}
        breakLongWords
        normalizeWhitespace
      />
      <g data-shared-principle="true">
        <FitText
          text={input.sharedPrinciple}
          x={480}
          y={460}
          width={760}
          fontSize={20}
          maxLines={3}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
