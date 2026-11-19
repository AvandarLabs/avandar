import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

type Props = { input: Input; doorWidth: number; accent: string };
/** A hinged locker exposes its interior before the learner leaves. */
export function SchoolLocker({
  input,
  doorWidth,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      <StockRect
        x={345}
        y={235}
        width={110}
        height={145}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
      />
      <StockRect
        data-locker-door={input.stops[0].id}
        x={345}
        y={235}
        width={doorWidth}
        height={145}
        fill={tokens.color.surface}
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
