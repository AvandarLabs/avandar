import { loopPhase } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Drops falling from the leaking joint. */
export function SideLeak({ frame }: Readonly<{ frame: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-side-leak="true">
      {[0, 1, 2].map((index) => {
        return (
          <circle
            key={index}
            cx={480}
            cy={300 + loopPhase(frame, 30, index * 10) * 110}
            r={4}
            fill={tokens.color.accentAlt}
          />
        );
      })}
    </g>
  );
}
