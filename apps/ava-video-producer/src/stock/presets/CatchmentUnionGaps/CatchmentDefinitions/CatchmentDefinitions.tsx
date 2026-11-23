import { getCatchmentShapesFromInput } from "../getCatchmentShapesFromInput";
import { EdgeFilter } from "./EdgeFilter";
import type { Input } from "../CatchmentUnionGaps.schema";
import type { ReactNode } from "react";

type Props = { input: Input; definitionId: string; accent: string };
/** Luminance mask value that keeps a region, not a colour. */
const MASK_SHOWN = "white";
/** Solid union alpha creates a single fill and a fused exterior boundary. */
export function CatchmentDefinitions({
  input,
  definitionId,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <defs>
      <mask
        id={`${definitionId}-union`}
        maskUnits="userSpaceOnUse"
        x={50}
        y={140}
        width={520}
        height={320}
      >
        {getCatchmentShapesFromInput(input).map((shape) => {
          return (
            <polygon key={shape.id} points={shape.points} fill={MASK_SHOWN} />
          );
        })}
      </mask>
      <EdgeFilter id={`${definitionId}-edge`} accent={accent} />
    </defs>
  );
}
