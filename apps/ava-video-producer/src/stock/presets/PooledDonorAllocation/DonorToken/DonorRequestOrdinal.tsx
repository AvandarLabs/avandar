import type { useDonorTokenPresentation } from "./useDonorTokenPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useDonorTokenPresentation>,
  "requestOrdinal" | "tokens" | "ordinalSize" | "data"
>;
/** Render the donor request ordinal. */
export function DonorRequestOrdinal(props: Readonly<Props>): ReactNode {
  return (
    <text
      x={0}
      y={17}
      textAnchor="middle"
      fontSize={props.ordinalSize}
      fontWeight={props.data.fontWeight}
      fontFamily={props.data.fontFamily}
      fill={props.tokens.color.ground}
    >
      {props.requestOrdinal}
    </text>
  );
}
