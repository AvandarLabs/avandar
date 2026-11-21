import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  fold: number;
  accent: string;
};
/** The opaque top flap, folding down last to close the cover. */
export function FinalFlap({ fold, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M0 0 L268 ${Motion.mix({
          t: fold,
          from: -84,
          to: 134,
        })} L536 0 z`,
      }}
      profile={tokens.sketch.shape}
      data-final-flap="opaque"
      fill={tokens.color.surface}
      stroke={accent}
    />
  );
}
