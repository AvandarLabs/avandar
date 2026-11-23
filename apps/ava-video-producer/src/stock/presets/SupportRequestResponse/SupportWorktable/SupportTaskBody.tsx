import { StockRect } from "../../../primitives/StockRect";
import type { useSupportWorktablePresentation } from "./useSupportWorktablePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSupportWorktablePresentation>,
  "input" | "scales" | "tokens" | "accent"
>;
/** Render the support task body. */
export function SupportTaskBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-unfinished-task={props.input.task.kind}
      data-owner={props.input.people.requester}
      x={330}
      y={310}
      width={240}
      height={55}
      rx={props.scales.corner(3)}
      fill={props.tokens.color.surface}
      stroke={props.accent}
      strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
    />
  );
}
