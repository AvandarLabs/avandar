import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props } from "./SharedFoundation";
import type { ReactNode } from "react";
/** One short support reconnects each preserved approach to the common base. */
export function FoundationSupports({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const reconnect = motion.reveal(frame, 108);
  return (
    <>
      {input.approaches.map((approach, index) => {
        const x = 260 + index * 440;
        return (
          <SketchedShape
            key={approach.id}
            shape={{
              kind: "line",
              x1: x,
              y1: 330,
              x2: x,
              y2: mix(reconnect, 330, 390),
            }}
            profile={tokens.sketch.shape}
            data-foundation-support={approach.id}
            stroke={index ? tokens.color.positive : accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
            opacity={reconnect}
          />
        );
      })}
    </>
  );
}
