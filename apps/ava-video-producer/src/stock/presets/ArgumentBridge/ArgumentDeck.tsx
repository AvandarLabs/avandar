import { EASE, mix, ramp } from "../../../motion";
import { ArgumentConclusion } from "./ArgumentConclusion";
import { ArgumentConnector } from "./ArgumentConnector";
import type { Props } from "./ArgumentBridge";
import type { ReactNode } from "react";
/** A common deck states solid support, necessity, or a qualified suggestion. */
export function ArgumentDeck({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const deck = ramp(frame, 60, 24, EASE.inOut);
  return (
    <g data-relationship={input.relationship}>
      <line
        data-bridge-deck="true"
        x1={mix(deck, 480, 30)}
        y1={350}
        x2={mix(deck, 480, 930)}
        y2={350}
        stroke={accent}
        strokeWidth={5}
        opacity={deck}
        strokeDasharray={input.relationship === "suggests" ? "8 7" : undefined}
      />
      {input.relationship === "requires" ? (
        <path
          data-required-brackets="true"
          d="M30 330 V370 H50 M930 330 V370 H910"
          fill="none"
          stroke={accent}
          strokeWidth={3}
          opacity={deck}
        />
      ) : null}
      <ArgumentConnector {...{ frame, input, accent, id: "connector" }} />
      <ArgumentConclusion {...{ frame, input, accent, id: "conclusion" }} />
    </g>
  );
}
