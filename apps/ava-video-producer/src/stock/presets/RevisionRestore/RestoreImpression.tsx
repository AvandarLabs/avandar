import { mix, ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";
type Props = {
  revision: Input["revisions"][number];
  index: number;
  frame: number;
  accent: string;
};
/** A copy lifts from its retained snapshot and aligns over current contents. */
export function RestoreImpression({
  revision,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 60, 18, EASE.inOut);
  return (
    <g
      data-restoring-id={revision.id}
      opacity={ramp(frame, 56, 8) * (1 - ramp(frame, 112, 14))}
    >
      <rect
        x={mix(progress, 40 + index * 225, 270)}
        y={mix(progress, 382, 140)}
        width={mix(progress, 205, 420)}
        height={mix(progress, 190, 200)}
        rx={8}
        fill={STOCK.surface}
        fillOpacity={0.22}
        stroke={accent}
        strokeWidth={2}
        strokeDasharray="8 5"
      />
      {revision.content.map((line, lineIndex) => (
        <path
          key={lineIndex}
          d={`M${mix(progress, 60 + index * 225, 294)} ${mix(progress, 433 + lineIndex * 43, 174 + lineIndex * 53)} h${Math.min(150, 20 + line.length * 4)}`}
          stroke={accent}
          strokeWidth={3}
          strokeOpacity={0.7}
        />
      ))}
    </g>
  );
}
