import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
        <g data-state-glyph={state}>
          <SketchedShape
            shape={{
              kind: "path",
              d:
                state === "mismatch"
                  ? `M909 ${y - 19} H920 V${y + 57} H909`
                  : state === "match"
                    ? `M905 ${y + 37} L911 ${y + 43} L925 ${y + 25}`
                    : `M915 ${y + 30} V${y + 42} M915 ${y + 48} V${y + 50}`,
            }}
            profile={tokens.sketch.shape}
            stroke={state === "mismatch" ? tokens.color.highlight : accent}
            strokeWidth={scales.stroke(tokens.stroke.default)}
            fill="none"
          />
        </g>
      ) : undefined}
    </g>
  );
}
