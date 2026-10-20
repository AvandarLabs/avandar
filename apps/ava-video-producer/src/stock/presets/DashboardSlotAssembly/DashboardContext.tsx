import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
const TITLE = {
  x: 24,
  y: 40,
  width: 912,
  fontSize: 18 as const,
  maxLines: 2,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "y"
  | "width"
  | "fontSize"
  | "maxLines"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
const SCOPE = {
  x: 38,
  y: 99,
  width: 884,
  fontSize: 12 as const,
  maxLines: 1,
  color: STOCK.muted,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "y"
  | "width"
  | "fontSize"
  | "maxLines"
  | "color"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
/** Shared context settles after panels dock, preserving all supplied copy. */
export function DashboardContext({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText {...TITLE} text={input.boardTitle} />
      {input.scopeLabel ? (
        <g opacity={ramp(frame, 112, 18)}>
          <StockRect
            x={24}
            y={80}
            width={912}
            height={28}
            rx={4}
            fill={STOCK.elevated}
          />
          <FitText {...SCOPE} text={input.scopeLabel} />
        </g>
      ) : undefined}
    </g>
  );
}
