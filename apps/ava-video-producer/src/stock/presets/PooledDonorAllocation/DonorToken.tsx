import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { ReactNode } from "react";
/** The type scale step of the request ordinal printed on an earmark tag. */
const REQUEST_ORDINAL_SIZE = "10";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const ordinalSize =
    GraphicThemeHooks.useGraphicFontSize(REQUEST_ORDINAL_SIZE);
  const data = tokens.text.graphic.data;
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
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: 17 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
      <LiteralDataText
        value={token.donor.mark}
        x={-12}
        y={3}
        color={tokens.color.text}
      />
      {token.donor.earmarkedRequestId === null ? (
        <path d="M0 9 L4 13 L0 17 L-4 13 Z" fill={tokens.color.accentAlt} />
      ) : (
        <>
          <path d="M-7 8 H7 V20 L0 17 L-7 20 Z" fill={tokens.color.highlight} />
          <text
            x={0}
            y={17}
            textAnchor="middle"
            fontSize={ordinalSize}
            fontWeight={data.fontWeight}
            fontFamily={data.fontFamily}
            fill={tokens.color.ground}
          >
            {requestOrdinal}
          </text>
        </>
      )}
    </g>
  );
}
