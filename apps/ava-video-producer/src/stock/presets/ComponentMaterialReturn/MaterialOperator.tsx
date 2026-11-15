import { getOperatorGripFromInputAndFrame } from "./getOperatorGripFromInputAndFrame";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The operator approaches empty-handed, then grips and carries one whole part.
 */
export function MaterialOperator({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, index } = getOperatorGripFromInputAndFrame({ input, frame });
  return (
    <g>
      <circle
        data-operator-head="physical"
        cx={x + 12}
        cy={y - 41}
        r={6}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <path
        data-operator-body="physical"
        d={`M${x + 12} ${y - 35}v18l-7 10M${x + 12} ${y - 17}l7 10M${x + 12} ${y - 29}l8 10L${x + 12} ${y}`}
        stroke={accent}
        strokeWidth={2}
        fill="none"
      />
      <circle
        data-hand="contact"
        data-active-part={index}
        cx={x + 12}
        cy={y}
        r={3}
        fill={accent}
      />
    </g>
  );
}
