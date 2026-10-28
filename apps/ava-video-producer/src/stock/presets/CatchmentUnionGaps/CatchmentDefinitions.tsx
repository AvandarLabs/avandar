import { getCatchmentShapesFromInput } from "./getCatchmentShapesFromInput";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
type Props = { input: Input; definitionId: string; accent: string };
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
        {getCatchmentShapesFromInput(input).map((shape) => (
          <polygon key={shape.id} points={shape.points} fill="white" />
        ))}
      </mask>
      <filter
        id={`${definitionId}-edge`}
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
      >
        <feMorphology
          in="SourceAlpha"
          operator="dilate"
          radius={2}
          result="expanded"
        />
        <feComposite
          in="expanded"
          in2="SourceAlpha"
          operator="out"
          result="edge"
        />
        <feFlood floodColor={accent} />
        <feComposite in2="edge" operator="in" />
      </filter>
    </defs>
  );
}
