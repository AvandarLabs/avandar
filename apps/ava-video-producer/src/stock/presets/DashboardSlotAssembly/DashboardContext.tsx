import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
/** Shared context settles after panels dock, preserving all supplied copy. */
export function DashboardContext({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g>
      <FitText {...TITLE} text={input.boardTitle} />
      {input.scopeLabel ? (
        <g opacity={ramp(frame, 112, motion.hero, motion.reveal.easing)}>
          <StockRect
            x={24}
            y={80}
            width={912}
            height={28}
            rx={scales.corner(tokens.corner.chip)}
            fill={tokens.color.elevated}
          />
          <FitText
            {...SCOPE}
            text={input.scopeLabel}
            color={tokens.color.textMuted}
          />
        </g>
      ) : undefined}
    </g>
  );
}
