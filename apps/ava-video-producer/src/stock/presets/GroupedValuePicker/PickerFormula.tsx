import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
};
/** Frames the formula takes to fade in. */
const FORMULA_FRAMES = 5;
/** The completed fold states the count or exact numeric calculation. */
export function PickerFormula({ input, frame }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const numeric = input.observations.flatMap(({ value }) => {
    return value === null ? [] : [value];
  });
  const formula =
    input.rule === "mean"
      ? `(${numeric.join(" + ")}) ÷ ${numeric.length}`
      : input.rule === "count"
        ? numeric
            .map(() => {
              return "1";
            })
            .join(" + ")
        : input.rule === "sum"
          ? numeric.join(" + ")
          : input.rule === "first"
            ? "①"
            : `${input.rule}(${numeric.join(", ")})`;
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 100,
        dur: motion.scale(FORMULA_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <LabelSlots labels={[[formula, 60, 440, 535, 12, 6]]} />
    </g>
  );
}
