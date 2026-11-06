import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { progress: number };
/** Classroom Desks for the authored scene. */
export function ClassroomDesks({ progress }: Readonly<Props>): ReactNode {
  return (
    <g data-desks={progress}>
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={index}
          data-desk={index}
          x={mix(progress, 230 + index * 95, index < 2 ? 65 : 625)}
          y={mix(progress, 335, index % 2 ? 425 : 335)}
          width={88}
          height={42}
          rx={5}
          fill={STOCK.surface}
          stroke={STOCK.line}
          strokeWidth={2}
        />
      ))}
    </g>
  );
}
