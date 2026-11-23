import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { InputPlaceholder } from "./InputPlaceholder";
import type { Input } from "../PocketInference.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
};
/** The supplied input fold enters a writing area entirely inside the device. */
export function PocketInput({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(frame, 38, motion.scale(16));
  const y = Motion.mix({
    t: progress,
    from: 218,
    to: 228,
  });
  const labels = _createInputLabels({ input, y, color: tokens.color });
  return (
    <g>
      <StockRect
        data-internal-input="local"
        x={202}
        y={y}
        width={556}
        height={94}
        rx={scales.corner(3)}
        fill={tokens.color.ground}
        stroke={tokens.color.line}
      />
      <g opacity={progress}>
        {input.showLabels ? (
          labels.map((label) => {
            return (
              <FitText
                key={label.y}
                {...label}
                x={214}
                width={532}
                fontSize={12}
                normalizeWhitespace
                breakLongWords
              />
            );
          })
        ) : (
          <InputPlaceholder y={y} />
        )}
      </g>
    </g>
  );
}
/** The input's label over its supplied text, inside the writing area. */
function _createInputLabels({
  input,
  y,
  color,
}: Readonly<{
  input: Input;
  y: number;
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
}>) {
  return [
    { text: input.input.label, y: y + 16, maxLines: 1, color: color.textMuted },
    { text: input.input.text, y: y + 38, maxLines: 4, color: color.text },
  ];
}
