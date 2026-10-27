import { getCatchmentShapesFromInput } from "./getCatchmentShapesFromInput";
import { IndividualFootprints } from "./IndividualFootprints";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  progress: number;
  accent: string;
  definitionId: string;
};
/** Duplicate tint peels away as the union fill and exterior edge take over. */
export function CatchmentFootprints({
  input,
  progress,
  accent,
  definitionId,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <IndividualFootprints input={input} progress={progress} accent={accent} />
      <rect
        data-union-fill=""
        x={50}
        y={140}
        width={520}
        height={320}
        mask={`url(#${definitionId}-union)`}
        fill={accent}
        opacity={0.25 * progress}
      />
      <g
        data-union-boundary=""
        filter={`url(#${definitionId}-edge)`}
        opacity={progress}
      >
        {getCatchmentShapesFromInput(input).map((shape) => (
          <polygon key={shape.id} points={shape.points} fill={accent} />
        ))}
      </g>
    </g>
  );
}
