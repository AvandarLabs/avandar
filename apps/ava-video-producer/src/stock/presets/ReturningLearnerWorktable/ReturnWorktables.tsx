import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { showPortfolioTrail: boolean; accent: string };
/** Two work surfaces retain the portfolio through its visible journey. */
export function ReturnWorktables({
  showPortfolioTrail,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <path
        d="M245 295 H590 M255 295 V405 M580 295 V405 M245 392 H590 M755 295 H920 M765 295 V400 M910 295 V400"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      {showPortfolioTrail ? (
        <path
          data-portfolio-trail="true"
          d="M390 172 H860"
          fill="none"
          stroke={accent}
          strokeDasharray="3 7"
          opacity={0.5}
        />
      ) : undefined}
    </>
  );
}
