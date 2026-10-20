import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ExpectationOverlayCheck.schema";
import type { ReactNode } from "react";
type Props = {
  item: Input["tests"][number];
  state: string;
  y: number;
  input: Input;
  accent: string;
};
/** Registered equality is judged while missing observations stay unobserved. */
export function ComparisonVerdict({
  item,
  state,
  y,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-verdict={item.observed === null ? undefined : item.id}>
      <LabelSlots
        labels={[
          [
            state === "unobserved"
              ? input.labels.untested
              : state === "match"
                ? input.labels.match
                : input.labels.mismatch,
            45,
            y + 96,
            220,
            12,
            3,
          ],
        ]}
      />
      {input.showStateGlyphs ? (
        <path
          data-state-glyph={state}
          d={
            state === "mismatch"
              ? `M909 ${y - 19} H920 V${y + 57} H909`
              : state === "match"
                ? `M905 ${y + 37} L911 ${y + 43} L925 ${y + 25}`
                : `M915 ${y + 30} V${y + 42} M915 ${y + 48} V${y + 50}`
          }
          stroke={state === "mismatch" ? STOCK.orange : accent}
          strokeWidth={2}
          fill="none"
        />
      ) : undefined}
    </g>
  );
}
