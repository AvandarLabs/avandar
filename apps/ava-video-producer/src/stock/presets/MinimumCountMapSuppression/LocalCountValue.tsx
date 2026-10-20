import { FitText } from "../../primitives/FitText/FitText";
import type { ReactNode } from "react";
type Props = { count: number; x: number; y: number };
/**
 * Analytical numerical copy stays readable independently of public suppression.
 */
export function LocalCountValue({ count, x, y }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={String(count)}
        x={x + 85}
        y={y + 78}
        width={80}
        fontSize={20}
        maxLines={1}
        anchor="middle"
      />
      <rect
        data-local-count={count}
        x={x + 60}
        y={y + 58}
        width={50}
        height={28}
        fill="none"
      />
    </g>
  );
}
