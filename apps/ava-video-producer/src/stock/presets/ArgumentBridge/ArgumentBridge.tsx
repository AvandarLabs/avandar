import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ArgumentDeck } from "./ArgumentDeck/ArgumentDeck";
import { ArgumentPremise } from "./ArgumentPremise";
import { PremiseHeading } from "./PremiseHeading";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";

/** Complete authored reasons and conclusion. */
export type Props = GraphicProps & {
  input: Input;
};

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
      <PremiseHeading frame={frame} input={input} motion={motion} />
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
