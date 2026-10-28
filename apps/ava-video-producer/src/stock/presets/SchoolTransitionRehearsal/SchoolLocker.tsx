import { STOCK } from "../../stockPalette";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";
type Props = { input: Input; doorWidth: number; accent: string };
/** A hinged locker exposes its interior before the learner leaves. */
export function SchoolLocker({
  input,
  doorWidth,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <rect
        x={345}
        y={235}
        width={110}
        height={145}
        fill={STOCK.surface}
        stroke={STOCK.muted}
      />
      <rect
        data-locker-door={input.stops[0].id}
        x={345}
        y={235}
        width={doorWidth}
        height={145}
        fill={STOCK.surface}
        stroke={accent}
      />
      <circle
        data-locker-handle=""
        cx={345 + doorWidth - 8}
        cy={305}
        r={3}
        fill={accent}
      />
    </g>
  );
}
