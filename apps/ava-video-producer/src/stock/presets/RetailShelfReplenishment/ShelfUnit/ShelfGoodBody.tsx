import { StockRect } from "../../../primitives/StockRect";
import type { useShelfUnitPresentation } from "./useShelfUnitPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useShelfUnitPresentation>,
  "scales" | "good" | "tokens" | "accent"
>;
/** Render the shelf good body. */
export function ShelfGoodBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={-12}
      y={-14}
      width={24}
      height={28}
      rx={props.scales.corner(
        props.good.symbol === "vegetables"
          ? props.tokens.corner.card
          : props.tokens.corner.chip,
      )}
      fill={props.tokens.color.surface}
      stroke={props.accent}
      strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
    />
  );
}
