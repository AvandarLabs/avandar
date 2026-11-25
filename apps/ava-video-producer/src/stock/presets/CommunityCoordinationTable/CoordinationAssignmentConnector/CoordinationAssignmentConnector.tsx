import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof getCoordinationPlaceColorFromIndex>;
  y: number;
};
/** Connects the team token to its destination marker. */
export function CoordinationAssignmentConnector({
  tokens,
  color,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M642 ${y + 9} V${y + 23} l-3 -4 m3 4 l3 -4`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: 642, cy: y + 43, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
    </>
  );
}
