import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./DuplicateReviewStack.schema";
import type { getDuplicateCardLayoutFromGroupAndFrame } from "./getDuplicateCardLayoutFromGroupAndFrame";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  layout: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>;
  accent: string;
};
/** Frames a card's role caption takes to fade in. */
const ROLE_FRAMES = 10;
/** Each comparison card owns its role in a reserved three-line caption slot. */
export function DuplicateCandidateRole({
  frame,
  input,
  group,
  layout,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  if (
    input.finalView !== "comparison-pair" ||
    group.retainedId === null ||
    frame <= 90
  ) {
    return null;
  }
  const { x, y, width, height, isRetained } = layout;
  const color = isRetained ? accent : tokens.color.textMuted;
  return (
    <g
      opacity={ramp(frame, 90, motion.scale(ROLE_FRAMES), motion.reveal.easing)}
    >
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 4} ${y + height}v4` }}
        profile={tokens.sketch.shape}
        stroke={color}
      />
      <FitText
        text={isRetained ? input.labels.retained : input.labels.alternatives}
        x={x + 4}
        y={y + height + 16}
        width={width - 8}
        fontSize={12}
        maxLines={3}
        color={color}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
