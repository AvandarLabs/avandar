import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { getRecipientPoseFromInputAndFrame } from "./getRecipientPoseFromInputAndFrame";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };

/**
 * A recipient-controlled hand remains attached throughout each counted pull.
 */
export function HandoverRecipient({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, handX, handY } = getRecipientPoseFromInputAndFrame({
    input,
    frame,
  });
  return (
    <g>
      <PersonGlyph x={x} y={y} size={30} color={accent} />
      <path
        data-recipient-arm
        d={`M${x} ${y} L${x - 12} ${handY + 9} L${handX} ${handY}`}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle data-recipient-hand cx={handX} cy={handY} r={3} fill={accent} />
    </g>
  );
}
