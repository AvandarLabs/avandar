import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ArgumentDeck } from "./ArgumentDeck/ArgumentDeck";
import { ArgumentPremise } from "./ArgumentPremise";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";
/** Complete authored reasons and conclusion. */
export type Props = GraphicProps & { input: Input };
/** Authored premises form a rhetorical support beneath a conclusion. */
export function ArgumentBridge({
  frame,
  accent,
  input,
  id,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      <g opacity={ramp(frame, 12, motion.hero, motion.reveal.easing)}>
        <FitText
          text={input.premiseHeading}
          x={480}
          y={54}
          width={840}
          fontSize={18}
          maxLines={3}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
      {input.premises.map((premise, index) => {
        return (
          <ArgumentPremise
            key={premise.id}
            frame={frame}
            accent={accent}
            premise={premise}
            index={index}
            count={input.premises.length}
            showSupport={input.showIndividualSupports}
            relationship={input.relationship}
          />
        );
      })}
      <ArgumentDeck {...{ frame, accent, input, id }} />
    </g>
  );
}
