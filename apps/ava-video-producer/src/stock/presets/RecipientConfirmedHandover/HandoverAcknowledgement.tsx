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
  const motion = useGraphicMotion();
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
      <AcknowledgementMark input={input} accent={accent} />
    </g>
  );
}

/** The recipient's initials, or a tick when no initials are authored. */
function AcknowledgementMark({
  input,
  accent,
}: Readonly<Omit<Props, "frame">>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  if (input.acknowledgementMark === "initials") {
    return (
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
    );
  }
  return (
    <SketchedShape
      shape={{ kind: "path", d: "M875 542 l9 8 l17 -18" }}
      profile={tokens.sketch.shape}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      fill="none"
    />
  );
}
