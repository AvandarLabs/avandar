import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  x: number;
  y: number;
};
/** Draws the page text-line guides. */
export function DocumentTextRules({
  tokens,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {[0, 1, 2, 3].map((index) => {
        return (
          <SketchedShape
            key={index}
            shape={{
              kind: "path",
              d: `M${x + 18} ${y + 26 + index * 34} h264`,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
            strokeOpacity={tokens.alpha.dimmed}
          />
        );
      })}
    </>
  );
}
