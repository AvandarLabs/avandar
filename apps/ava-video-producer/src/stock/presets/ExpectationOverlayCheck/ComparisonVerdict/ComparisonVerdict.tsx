import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { StateGlyph } from "./StateGlyph";
import type { Input } from "../ExpectationOverlayCheck.schema";
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
        <StateGlyph state={state} y={y} accent={accent} />
      ) : undefined}
    </g>
  );
}
