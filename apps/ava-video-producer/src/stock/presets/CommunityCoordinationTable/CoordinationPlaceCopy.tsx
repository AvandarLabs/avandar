import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CoordinationPlaceCopyPlaceKey } from "./CoordinationPlaceCopyPlaceKey/CoordinationPlaceCopyPlaceKey";
import { CoordinationPlaceCopyRequestCard } from "./CoordinationPlaceCopyRequestCard/CoordinationPlaceCopyRequestCard";
import { CoordinationPlaceName } from "./CoordinationPlaceName/CoordinationPlaceName";
import { CoordinationRequestLabel } from "./CoordinationRequestLabel/CoordinationRequestLabel";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  place: Input["places"][number];
  index: number;
  frame: number;
  accent: string;
};
/** A keyed request card has a visible connector to its actual map location. */
export function CoordinationPlaceCopy({
  place,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const color = getCoordinationPlaceColorFromIndex({
    index,
    accent,
    color: tokens.color,
  });
  const y = 120 + 108 * index;
  return (
    <g data-request={place.id} data-request-face={frame >= 108 ? "up" : "edge"}>
      <SketchedShape
        shape={{ kind: "circle", cx: 25, cy: y - 4, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
      <CoordinationPlaceCopyPlaceKey {...{ place, y, tokens, color, index }} />
      <CoordinationPlaceName place={place} y={y} />
      <CoordinationPlaceCopyRequestCard
        {...{ place, index, scales, tokens, color, frame, atomic }}
      />
      <CoordinationRequestLabel place={place} index={index} />
    </g>
  );
}
