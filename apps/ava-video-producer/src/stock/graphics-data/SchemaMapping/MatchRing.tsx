import { Check } from "../../graphics-common/Check";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
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
  const shapes = useGraphicShapeScales();
  const x = GRAPHIC_WIDTH / 2;
  return (
    <g opacity={opacity}>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: style.ringRadius }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.ringAlpha}
        strokeWidth={shapes.stroke(style.ringStrokeWidth)}
      />
      {showCheck ? (
        <Check x={x} y={y} color={color} size={style.checkSize} />
      ) : null}
    </g>
  );
}
