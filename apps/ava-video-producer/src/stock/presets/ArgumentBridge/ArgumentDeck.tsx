import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ArgumentConclusion } from "./ArgumentConclusion";
import { ArgumentConnector } from "./ArgumentConnector";
import { SUGGESTED_DASH } from "./argumentShape";
import type { Props } from "./ArgumentBridge";
import type { ReactNode } from "react";
/** Frames the deck takes to extend to both ends. */
const DECK_FRAMES = 24;
/** The deck's line weight before the line weight scales it. */
const DECK_STROKE = 5;

/** A common deck states solid support, necessity, or a qualified suggestion. */
export function ArgumentDeck({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const deck = ramp(frame, 60, motion.scale(DECK_FRAMES), motion.travel.easing);
  return (
    <g data-relationship={input.relationship}>
      <g data-bridge-deck="true">
        <SketchedShape
          shape={{
            kind: "line",
            x1: mix(deck, 480, 30),
            y1: 350,
            x2: mix(deck, 480, 930),
            y2: 350,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(DECK_STROKE)}
          opacity={deck}
          strokeDasharray={
            input.relationship === "suggests" ? SUGGESTED_DASH : undefined
          }
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

/** Brackets at both ends of the deck when the premises are necessary. */
function RequiredBrackets({
  deck,
  accent,
}: Readonly<{ deck: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-required-brackets="true">
      <SketchedShape
        shape={{ kind: "path", d: "M30 330 V370 H50 M930 330 V370 H910" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        opacity={deck}
      />
    </g>
  );
}
