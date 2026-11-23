import { StockRect } from "../../../primitives/StockRect";
import type { useJigStationPresentation } from "./useJigStationPresentation";
import type { ReactNode } from "react";
/** A fabric workpiece's corner, before the theme's corner style. */
const FABRIC_CORNER = 16;
/** A card workpiece's corner, before the theme's corner style. */
const CARD_CORNER = 2;
type Props = Pick<
  ReturnType<typeof useJigStationPresentation>,
  "collaborator" | "x" | "scales" | "input" | "tokens" | "atomic"
>;
/** Render the jig workpiece. */
export function JigWorkpiece(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-workpiece={props.collaborator.id}
      x={props.x - 70}
      y={330}
      width={140}
      height={112}
      rx={props.scales.corner(
        props.input.workpieceMaterial === "fabric"
          ? FABRIC_CORNER
          : CARD_CORNER,
      )}
      fill={props.tokens.color.surface}
      stroke={props.tokens.color.line}
      strokeDasharray={
        props.input.workpieceMaterial === "fabric"
          ? props.atomic.dash.stitch.join(" ")
          : undefined
      }
    />
  );
}
