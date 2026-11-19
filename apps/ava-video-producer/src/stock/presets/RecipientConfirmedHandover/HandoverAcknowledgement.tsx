import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/**
 * The authored mark acknowledges the counted list after physical selection
 * ends.
 */
export function HandoverAcknowledgement({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g
      opacity={motion.reveal(frame, 114)}
      data-acknowledgement={input.acknowledgementMark}
    >
      <FitText
        text={input.receiptLabels.acknowledgement}
        x={718}
        y={510}
        width={188}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {input.acknowledgementMark === "initials" ? (
        <FitText
          text={input.initialsText}
          x={860}
          y={552}
          width={60}
          fontSize={14}
          maxLines={1}
          normalizeWhitespace
          breakLongWords
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: "M875 542 l9 8 l17 -18" }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          fill="none"
        />
      )}
    </g>
  );
}
