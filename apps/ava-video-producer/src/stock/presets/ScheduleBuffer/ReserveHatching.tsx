import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { x: number; width: number };
/** Hatch marks remain within the exact remaining reserve width. */
export function ReserveHatching({ x, width }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {Array.from({ length: Math.floor(width / 12) }, (_, index) => {
        return (
          <SketchedShape
            key={index}
            shape={{
              kind: "path",
              d: `M${x + index * 12} 370 l${Math.min(10, width - index * 12)} -60`,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.inactive}
            strokeOpacity={tokens.alpha.ghost}
          />
        );
      })}
    </g>
  );
}
