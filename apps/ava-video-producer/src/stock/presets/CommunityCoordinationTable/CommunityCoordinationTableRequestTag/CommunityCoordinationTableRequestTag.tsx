import { SketchedShape } from "../../../primitives/SketchedShape";
import { CoordinationPlaceBoundary } from "../CoordinationPlaceBoundary/CoordinationPlaceBoundary";
import { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { CommunityCoordinationTable } from "../CommunityCoordinationTable";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof CommunityCoordinationTable>[0]["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: Parameters<typeof CommunityCoordinationTable>[0]["accent"];
  frame: Parameters<typeof CommunityCoordinationTable>[0]["frame"];
};

/** Renders the request tag with authored geometry. */
export function CommunityCoordinationTableRequestTag({
  input,
  tokens,
  accent,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.places.map((place, index) => {
        return (
          <g key={place.id}>
            <CoordinationPlaceBoundary {...{ place, tokens, index, accent }} />
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${340 + place.x * 270 - 7} ${160 + place.y * 280 - 5} h${frame >= 108 ? 14 : 3} v10 h${frame >= 108 ? -14 : -3} Z`,
              }}
              profile={tokens.sketch.shape}
              data-request-tag={place.id}
              fill={tokens.color.surface}
              stroke={getCoordinationPlaceColorFromIndex({
                index,
                accent,
                color: tokens.color,
              })}
            />
          </g>
        );
      })}
    </>
  );
}
