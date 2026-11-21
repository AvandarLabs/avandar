import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import {
  ICON_CORNER,
  ICON_FILL_ALPHA,
  GLYPH_STROKE,
} from "./StaggerCards.constants";
import type { CardCompletionData } from "./StaggerCards.types";
import type { ReactNode } from "react";

type Props = CardCompletionData;

/** Renders the card icon layer for StaggerCards. */
export function CardIcon(props: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={props.x + 21}
        y={props.y + 21}
        width={38}
        height={38}
        rx={props.shapes.corner(ICON_CORNER)}
        fill={props.cardColor}
        fillOpacity={props.shapes.wash(ICON_FILL_ALPHA)}
        stroke={props.cardColor}
        strokeOpacity={props.atomic.opacity["28"]}
        strokeWidth={props.hairline}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${props.x + 31} ${props.y + 33} h18 M${props.x + 31} ${props.y + 40} h${12 + (props.cardIndex % 3) * 3} M${props.x + 31} ${props.y + 47} h15`,
        }}
        profile={props.sketch.shape}
        stroke={props.cardColor}
        strokeWidth={props.shapes.stroke(GLYPH_STROKE)}
        strokeLinecap="round"
      />
    </>
  );
}
