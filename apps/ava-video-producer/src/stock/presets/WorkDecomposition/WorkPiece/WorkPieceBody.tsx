import { StockRect } from "../../../primitives/StockRect";
import type { useWorkPiecePresentation } from "./useWorkPiecePresentation";
import type { ReactNode } from "react";
/** The tint of a work piece, before the theme's tint strength. */
const PIECE_TINT = 0.16;
type Props = Pick<
  ReturnType<typeof useWorkPiecePresentation>,
  | "piece"
  | "parentLabel"
  | "x"
  | "y"
  | "color"
  | "scales"
  | "tokens"
  | "separation"
>;
/** Render the work piece body. */
export function WorkPieceBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-piece-id={props.piece.id}
      data-parent={props.parentLabel}
      x={props.x}
      y={props.y}
      width={props.piece.width}
      height={props.piece.height}
      fill={props.color}
      fillOpacity={props.scales.wash(PIECE_TINT)}
      stroke={props.tokens.color.ground}
      strokeWidth={props.scales.stroke(
        props.separation * props.tokens.stroke.default,
      )}
    />
  );
}
