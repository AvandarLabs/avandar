import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";
/** An authored caption qualifies the topics outside the current explanation. */
export function OutsideCaption({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <>
      <g data-outside-caption="true" opacity={motion.reveal(frame, 108)}>
        <FitText
          text={input.outsideLabel}
          x={480}
          y={552}
          width={840}
          fontSize={18}
          maxLines={1}
          anchor="middle"
          color={tokens.color.textMuted}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
