import { StockRect } from "../../../../primitives/StockRect";
import type { getLocalExecutionRowLayout } from "./getLocalExecutionRowLayout";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof getLocalExecutionRowLayout>,
  "row" | "index" | "selected" | "applied" | "accent" | "tokens" | "scales"
>;
/** Render the local execution row body. */
export function LocalExecutionRowBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-row-body={props.row.id}
      x={50}
      y={342 + props.index * 32}
      width={500}
      height={30}
      fill={
        props.selected && props.applied > 0
          ? props.accent
          : props.tokens.color.surface
      }
      fillOpacity={
        props.selected
          ? props.scales.wash(props.tokens.alpha.tint * (1 + props.applied))
          : 1
      }
      stroke={
        props.selected && props.applied > 0
          ? props.accent
          : props.tokens.color.line
      }
    />
  );
}
