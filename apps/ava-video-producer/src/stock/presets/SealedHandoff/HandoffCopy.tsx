import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input };
/**
 * State copy follows closure, arrival and the separately authored recipient
 * reveal.
 */
export function HandoffCopy({ frame, input }: Readonly<Props>): ReactNode {
  if (!input.showLabels) {
    return undefined;
  }
  const state =
    frame < 66
      ? "contents"
      : frame < 108
        ? "covered"
        : input.revealRule === "recipient" && frame >= 120
          ? "opened"
          : "received";
  return (
    <g>
      <FitText
        text={input.copy[state]}
        x={480}
        y={72}
        width={700}
        fontSize={14}
        maxLines={2}
        anchor="middle"
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.copy.example}
        x={480}
        y={580}
        width={700}
        fontSize={14}
        maxLines={2}
        anchor="middle"
        normalizeWhitespace
        breakLongWords
        color={STOCK.muted}
      />
    </g>
  );
}
