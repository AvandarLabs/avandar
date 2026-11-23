import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props } from "./ArgumentBridge";
import type { ReactNode } from "react";
/** Frames the conclusion takes to rise into place. */
const RISE_FRAMES = 24;
/** The authored conclusion rises above the completed support deck. */
export function ArgumentConclusion({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const conclusion = Motion.ramp({
    frame,
    at: 84,
    dur: motion.scale(RISE_FRAMES),
    easing: motion.travel.easing,
  });
  return (
    <>
      <g
        data-conclusion="true"
        opacity={conclusion}
        transform={`translate(0 ${Motion.mix({
          t: conclusion,
          from: 18,
          to: 0,
        })})`}
      >
        <FitText
          text={input.conclusion}
          x={480}
          y={162}
          width={800}
          fontSize={24}
          maxLines={4}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
        <SketchedShape
          shape={{ kind: "path", d: "M400 266 H560 M480 266 V278" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.line}
          fill="none"
        />
      </g>
    </>
  );
}
