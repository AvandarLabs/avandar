import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as HandoverAcknowledgementSharedProps } from "./HandoverAcknowledgementShared.types";
import type { ReactNode } from "react";

type Props = Omit<HandoverAcknowledgementSharedProps, "frame">;

/** The recipient's initials, or a tick when no initials are authored. */
export function AcknowledgementMark({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
