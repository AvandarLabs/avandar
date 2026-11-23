import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getTeamMarkerPoseFromInputAndFrame } from "../getTeamMarkerPoseFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  index: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  x: ReturnType<typeof getTeamMarkerPoseFromInputAndFrame>["x"];
  y: ReturnType<typeof getTeamMarkerPoseFromInputAndFrame>["y"];
};
/** Labels the physical token with its stable team number. */
export function CoordinationTeamOrdinal({
  index,
  tokens,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <text
        data-team-key
        x={x}
        y={y + 3}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        textAnchor="middle"
        fill={tokens.color.text}
      >
        {index + 1}
      </text>
    </>
  );
}
