import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props } from "./ArgumentBridge";
import type { ReactNode } from "react";
/** Connective language follows the separately readable authored premises. */
export function ArgumentConnector({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <>
      <g
        data-connector="true"
        opacity={ramp(frame, 60, motion.hero, motion.reveal.easing)}
      >
        <FitText
          text={input.connectorText}
          x={480}
          y={294}
          width={800}
          fontSize={18}
          maxLines={2}
          color={tokens.color.positive}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
