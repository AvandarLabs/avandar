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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const width = scales.stroke(tokens.stroke.emphasis);
  const draw = (at: number) => {
    return ramp(frame, at, motion.scale(TAG_DRAW_FRAMES), motion.reveal.easing);
  };
  return (
    <g>
      <LiteralDataText value={input.saved.header} x={52} y={416} />
      <LiteralDataText value={input.current.header} x={508} y={416} />
      <LiteralDataText value={input.saved.fingerprint} x={52} y={450} />
      <LiteralDataText value={input.current.fingerprint} x={508} y={450} />
      <SketchedShape
        shape={{ kind: "path", d: "M456 412 h36" }}
        profile={tokens.sketch.shape}
        stroke={
          input.saved.header === input.current.header
            ? accent
            : tokens.color.highlight
        }
        strokeWidth={width}
        pathLength={TAG_LENGTH}
        strokeDasharray={TAG_LENGTH}
        strokeDashoffset={TAG_LENGTH * (1 - draw(51))}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M456 446 h36" }}
        profile={tokens.sketch.shape}
        stroke={
          input.saved.fingerprint === input.current.fingerprint
            ? accent
            : tokens.color.highlight
        }
        strokeWidth={width}
        pathLength={TAG_LENGTH}
        strokeDasharray={TAG_LENGTH}
        strokeDashoffset={TAG_LENGTH * (1 - draw(78))}
      />
    </g>
  );
}
