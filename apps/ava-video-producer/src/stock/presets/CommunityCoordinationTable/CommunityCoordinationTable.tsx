import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DEFAULT_INPUT } from "./CommunityCoordinationTable.fixtures";
import { CoordinationActors } from "./CoordinationActors";
import { CoordinationLabels } from "./CoordinationLabels";
import { CoordinationMarker } from "./CoordinationMarker";
import { CoordinationPlaceConnections } from "./CoordinationPlaceConnections";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * One authored reallocation responds to community input on a schematic table.
 */
export function CommunityCoordinationTable({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={330}
        y={135}
        width={300}
        height={355}
        rx={scales.corner(24)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M350 220 Q470 290 610 220 M350 390 Q470 330 610 390",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.open.join(" ")}
      />
      {input.places.map((place, index) => {
        return (
          <g key={place.id}>
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
      <CoordinationPlaceConnections input={input} accent={accent} />
      <CoordinationActors input={input} frame={frame} accent={accent} />
      {input.teams.map((team, index) => {
        return (
          <CoordinationMarker
            key={team.id}
            index={index}
            input={input}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <CoordinationLabels input={input} frame={frame} accent={accent} />
    </g>
  );
}
