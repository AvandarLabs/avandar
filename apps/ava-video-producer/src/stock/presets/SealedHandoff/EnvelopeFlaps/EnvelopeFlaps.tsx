import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EnvelopeSideFlaps } from "./EnvelopeSideFlaps";
import type { Input } from "../SealedHandoff.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
};

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
          d: `M0 266 L268 ${Motion.mix({
            t: lower * (1 - opening),
            from: 350,
            to: 134,
          })} L536 266 z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.elevated}
        stroke={tokens.color.line}
      />
      <EnvelopeSideFlaps
        frame={frame}
        accent={accent}
        tokens={tokens}
        sides={sides}
        final={final}
        opening={opening}
      />
    </g>
  );
}
