import type { useFundingEnvelopePresentation } from "./useFundingEnvelopePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useFundingEnvelopePresentation>,
  "accent" | "allocatedCredits" | "tokens" | "request" | "width" | "x" | "top"
>;
/** Render the allocation credit total. */
export function AllocationCreditTotal(props: Readonly<Props>): ReactNode {
  return (
    <text
      data-allocation-total={props.request.id}
      x={props.x + props.width - 36}
      y={props.top + 27}
      textAnchor="end"
      fill={props.accent}
      fontSize={props.tokens.text.graphic.value.fontSize}
      fontFamily={props.tokens.text.graphic.value.fontFamily}
      fontWeight={props.tokens.text.graphic.value.fontWeight}
    >
      {props.allocatedCredits}
    </text>
  );
}
