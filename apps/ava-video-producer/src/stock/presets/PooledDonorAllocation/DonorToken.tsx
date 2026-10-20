import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { ReactNode } from "react";
type Props = {
  token: ReturnType<typeof getAllocationTokensFromInputAndFrame>[number];
  requestOrdinal: number;
  accent: string;
};
/** Donor identity and earmark ribbon remain on the same single-credit token. */
export function DonorToken({
  token,
  requestOrdinal,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-token={`${token.donorIndex}:${token.unitIndex}`}
      data-donor={token.donor.id}
      data-owner={token.owner}
      data-request={token.arrived ? (token.requestId ?? undefined) : undefined}
      data-earmark={token.donor.earmarkedRequestId ?? undefined}
      data-flexible={token.donor.earmarkedRequestId === null}
      data-x={token.x}
      data-y={token.y}
      transform={`translate(${token.x} ${token.y})`}
    >
      <circle
        cx={0}
        cy={0}
        r={17}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={1.5}
      />
      <LiteralDataText
        value={token.donor.mark}
        x={-12}
        y={3}
        color={STOCK.text}
      />
      {token.donor.earmarkedRequestId === null ? (
        <path d="M0 9 L4 13 L0 17 L-4 13 Z" fill={STOCK.cyan} />
      ) : (
        <>
          <path d="M-7 8 H7 V20 L0 17 L-7 20 Z" fill={STOCK.orange} />
          <text
            x={0}
            y={17}
            textAnchor="middle"
            fontSize={10}
            fill={STOCK.ground}
          >
            {requestOrdinal}
          </text>
        </>
      )}
    </g>
  );
}
