import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CapabilityMatrix.schema";
import type { ReactNode } from "react";

type CapabilityCaptionText = {
  text: Input["caption"];
  x: number;
  y: number;
  width: number;
  fontSize: 24;
  maxLines: number;
};

type Props = {
  frame: number;
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  caption: CapabilityCaptionText;
};
/** Displays the capability caption on its reveal cue. */
export function CapabilityCaption({
  frame,
  input,
  motion,
  caption,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        aria-label={input.caption}
        opacity={Motion.ramp({
          frame,
          at: 12,
          dur: motion.hero,
          easing: motion.reveal.easing,
        })}
      >
        <FitText
          {...caption}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
        />
      </g>
    </>
  );
}
