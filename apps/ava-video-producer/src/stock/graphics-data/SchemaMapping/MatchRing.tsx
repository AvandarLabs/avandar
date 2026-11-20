import { Check } from "../../graphics-common/Check";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  y: number;
  color: string;
  opacity: number;
  showCheck: boolean;
};

/**
 * The ring on the centre line where a mapping connects, with an optional check.
 */
export function MatchRing({ y, color, opacity, showCheck }: Props): ReactNode {
  const style = useGraphicProps("SchemaMapping", {});
  const tokens = useGraphicTokens();
  const x = GRAPHIC_WIDTH / 2;
  return (
    <g opacity={opacity}>
      <circle
        cx={x}
        cy={y}
        r={style.ringRadius}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.ringAlpha}
        strokeWidth={style.ringStrokeWidth}
      />
      {showCheck ? (
        <Check x={x} y={y} color={color} size={style.checkSize} />
      ) : null}
    </g>
  );
}
