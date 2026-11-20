import { ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Frames each comparison stroke takes to draw. */
const TAG_DRAW_FRAMES = 22;
/** A comparison stroke's normalized path length, which its dash spans. */
const TAG_LENGTH = 1;
/** Header and fingerprint tags have independent, exact comparison strokes. */
export function ComparisonTags({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LiteralDataText value={input.saved.header} x={52} y={416} />
      <LiteralDataText value={input.current.header} x={508} y={416} />
      <LiteralDataText value={input.saved.fingerprint} x={52} y={450} />
      <LiteralDataText value={input.current.fingerprint} x={508} y={450} />
      <ComparisonStroke
        y={412}
        isMatch={input.saved.header === input.current.header}
        frame={frame}
        at={51}
        accent={accent}
      />
      <ComparisonStroke
        y={446}
        isMatch={input.saved.fingerprint === input.current.fingerprint}
        frame={frame}
        at={78}
        accent={accent}
      />
    </g>
  );
}

/** One comparison stroke, in the accent on a match, drawing on from `at`. */
function ComparisonStroke({
  y,
  isMatch,
  frame,
  at,
  accent,
}: Readonly<{
  y: number;
  isMatch: boolean;
  frame: number;
  at: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const draw = ramp(
    frame,
    at,
    motion.scale(TAG_DRAW_FRAMES),
    motion.reveal.easing,
  );
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M456 ${y} h36` }}
      profile={tokens.sketch.shape}
      stroke={isMatch ? accent : tokens.color.highlight}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      pathLength={TAG_LENGTH}
      strokeDasharray={TAG_LENGTH}
      strokeDashoffset={TAG_LENGTH * (1 - draw)}
    />
  );
}
