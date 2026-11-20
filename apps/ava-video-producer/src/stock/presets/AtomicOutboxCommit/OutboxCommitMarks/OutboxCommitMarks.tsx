import { mix, ramp } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CommitStamps } from "./CommitStamps";
import type { Input } from "../AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Frames the shared latch takes to close. */
const LATCH_FRAMES = 54;
/** One shared latch closes before both commit stamps appear. */
export function OutboxCommitMarks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const latchY = mix(
    ramp(frame, 56, motion.scale(LATCH_FRAMES), motion.travel.easing),
    128,
    150,
  );
  return (
    <g>
      {" "}
      <g data-commit-latch="true">
        <SketchedShape
          shape={{ kind: "line", x1: 100, x2: 860, y1: latchY, y2: latchY }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: `M465 ${latchY} v-12 h30 v12` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {input.outcome === "commit" ? (
        <CommitStamps frame={frame} accent={accent} />
      ) : undefined}
    </g>
  );
}
