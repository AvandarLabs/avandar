import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AcknowledgementMark } from "./AcknowledgementMark";
import { type Props } from "./HandoverAcknowledgementShared.types";
import type { ReactNode } from "react";
/**
 * The authored mark acknowledges the counted list after physical selection
 * ends.
 */
export function HandoverAcknowledgement({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
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
