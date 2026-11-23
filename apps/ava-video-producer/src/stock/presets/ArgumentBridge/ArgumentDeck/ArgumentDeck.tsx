import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ArgumentConclusion } from "../ArgumentConclusion";
import { ArgumentConnector } from "../ArgumentConnector";
import { DeckSpan } from "./DeckSpan";
import { RequiredBrackets } from "./RequiredBrackets";
import type { Props } from "../ArgumentBridge";
import type { ReactNode } from "react";

/** Frames the deck takes to extend to both ends. */
const DECK_FRAMES = 24;

/** A common deck states solid support, necessity, or a qualified suggestion. */
export function ArgumentDeck({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const deck = Motion.ramp({
    frame,
    at: 60,
    dur: motion.scale(DECK_FRAMES),
    easing: motion.travel.easing,
  });
  return (
    <g data-relationship={input.relationship}>
      <g data-bridge-deck="true">
        <DeckSpan
          accent={accent}
          input={input}
          tokens={tokens}
          scales={scales}
          deck={deck}
        />
      </g>
      {input.relationship === "requires" ? (
        <RequiredBrackets deck={deck} accent={accent} />
      ) : null}
      <ArgumentConnector {...{ frame, input, accent, id: "connector" }} />
      <ArgumentConclusion {...{ frame, input, accent, id: "conclusion" }} />
    </g>
  );
}
