import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { material: string };

/** Wood grain or a fabric seam allowance; a plain sheet has neither. */
export function MaterialTexture({ material }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <>
      {material === "wood" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: "M8 20 Q80 6 212 20 M8 93 Q150 108 212 94",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.highlight}
          strokeOpacity={atomic.opacity["30"]}
        />
      ) : undefined}
      {material === "fabric" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M7 7 H213 V109 H7 Z" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.positive}
          strokeDasharray={tokens.dash.guide.join(" ")}
        />
      ) : undefined}
    </>
  );
}
