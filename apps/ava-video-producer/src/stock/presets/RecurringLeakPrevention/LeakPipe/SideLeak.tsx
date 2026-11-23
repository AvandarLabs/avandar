import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
/** Drops falling from the leaking joint. */
export function SideLeak({ frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-side-leak="true">
      {[0, 1, 2].map((index) => {
        return (
          <circle
            key={index}
            cx={480}
            cy={
              300 +
              Motion.loopPhase({
                frame,
                period: 30,
                offset: index * 10,
              }) *
                110
            }
            r={4}
            fill={tokens.color.accentAlt}
          />
        );
      })}
    </g>
  );
}
