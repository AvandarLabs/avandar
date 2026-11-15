import type { ReactNode } from "react";
/** Inputs for LegendScale. */
type Props = { accent: string };

/**
 * A fixed zero-to-maximum shade key accompanies both explicitly named measures.
 */
export function LegendScale({ accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {Array.from({ length: 10 }, (_, index) => (
        <rect
          key={index}
          x={40 + index * 24}
          y={100}
          width={24}
          height={12}
          fill={accent}
          fillOpacity={0.12 + (index / 9) * 0.76}
        />
      ))}
    </g>
  );
}
