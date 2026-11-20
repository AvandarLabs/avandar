import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";
/** Inputs for FoundationCopy. */
type Props = { input: Input };
/** One shared phrase remains intact as the foundation sections are exposed. */
export function FoundationCopy({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
        color={tokens.color.positive}
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
