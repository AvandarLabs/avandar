import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EnvelopeCover } from "../EnvelopeCover";
import { FinalFlap } from "./FinalFlap";
import { FlapCreases } from "./FlapCreases";
import type { Input } from "../SealedHandoff.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Physical flaps finish in an opaque cover before travel can begin. */
export function EnvelopeFlaps({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const lower = motion.reveal(frame, 36);
  const sides = motion.reveal(frame, 44);
  const final = motion.ramp(frame, 56, motion.scale(10));
  const opening =
    input.revealRule === "recipient"
      ? motion.ramp(frame, 120, motion.scale(16))
      : 0;
  const coverProgress = frame < 66 ? final : 1 - opening;
  return (
    <g data-cover-progress={coverProgress}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 266 L268 ${mix(lower * (1 - opening), 350, 134)} L536 266 z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.elevated}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 0 L${mix(sides * (1 - opening), -36, 268)} 133 L0 266 z M536 0 L${mix(sides * (1 - opening), 572, 268)} 133 L536 266 z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      {frame >= 66 ? <EnvelopeCover opening={opening} /> : undefined}
      {frame >= 56 ? (
        <FinalFlap fold={final * (1 - opening)} accent={accent} />
      ) : undefined}
      {frame >= 66 && opening === 0 ? <FlapCreases /> : undefined}
    </g>
  );
}
