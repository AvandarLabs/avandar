import { SketchedShape } from "../../../primitives/SketchedShape";
import { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { CommunityCoordinationTable } from "../CommunityCoordinationTable";
import type { ReactNode } from "react";

type Props = {
  place: Parameters<
    typeof CommunityCoordinationTable
  >[0]["input"]["places"][number];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  index: number;
  accent: Parameters<typeof CommunityCoordinationTable>[0]["accent"];
};

/** Renders the outline with authored geometry. */
export function CoordinationPlaceBoundary({
  place,
  tokens,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "circle",
        cx: 340 + place.x * 270,
        cy: 160 + place.y * 280,
        r: 25,
      }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={getCoordinationPlaceColorFromIndex({
        index,
        accent,
        color: tokens.color,
      })}
    />
  );
}
