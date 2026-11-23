import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../DuplicateReviewStack.schema";
import type { getDuplicateCardLayoutFromGroupAndFrame } from "../getDuplicateCardLayoutFromGroupAndFrame";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  layout: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>;
  accent: string;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  x: Readonly<ParentProps>["layout"]["x"];
  y: Readonly<ParentProps>["layout"]["y"];
  width: Readonly<ParentProps>["layout"]["width"];
  height: Readonly<ParentProps>["layout"]["height"];
  isRetained: Readonly<ParentProps>["layout"]["isRetained"];
  color:
    | Readonly<ParentProps>["accent"]
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["textMuted"];
};

/** Frames a card's role caption takes to fade in. */
const ROLE_FRAMES = 10;

/** Renders the candidate role caption in authored paint order. */
export function CandidateRoleCaption(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame: options.frame,
        at: 90,
        dur: options.motion.scale(ROLE_FRAMES),
        easing: options.motion.reveal.easing,
      })}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.x + 4} ${options.y + options.height}v4`,
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.color}
      />
      <FitText
        text={
          options.isRetained
            ? options.input.labels.retained
            : options.input.labels.alternatives
        }
        x={options.x + 4}
        y={options.y + options.height + 16}
        width={options.width - 8}
        fontSize={12}
        maxLines={3}
        color={options.color}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
