import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { DonorRequestOrdinal } from "./DonorRequestOrdinal";
import { DonorTokenOutline } from "./DonorTokenOutline";
import { useDonorTokenPresentation } from "./useDonorTokenPresentation";
import type { getAllocationTokensFromInputAndFrame } from "../getAllocationTokensFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  token: ReturnType<typeof getAllocationTokensFromInputAndFrame>[number];
  requestOrdinal: number;
  accent: string;
};
/** Donor identity and earmark ribbon remain on the same single-credit token. */
export function DonorToken(props: Readonly<Props>): ReactNode {
  const presentation = useDonorTokenPresentation(props);

  return (
    <g
      data-token={`${props.token.donorIndex}:${props.token.unitIndex}`}
      data-donor={props.token.donor.id}
      data-owner={props.token.owner}
      data-request={
        props.token.arrived ? (props.token.requestId ?? undefined) : undefined
      }
      data-earmark={props.token.donor.earmarkedRequestId ?? undefined}
      data-flexible={props.token.donor.earmarkedRequestId === null}
      data-x={props.token.x}
      data-y={props.token.y}
      transform={`translate(${props.token.x} ${props.token.y})`}
    >
      <DonorTokenOutline {...presentation} />
      <LiteralDataText
        value={props.token.donor.mark}
        x={-12}
        y={3}
        color={presentation.tokens.color.text}
      />
      {props.token.donor.earmarkedRequestId === null ? (
        <path
          d="M0 9 L4 13 L0 17 L-4 13 Z"
          fill={presentation.tokens.color.accentAlt}
        />
      ) : (
        <>
          <path
            d="M-7 8 H7 V20 L0 17 L-7 20 Z"
            fill={presentation.tokens.color.highlight}
          />
          <DonorRequestOrdinal {...presentation} />
        </>
      )}
    </g>
  );
}
