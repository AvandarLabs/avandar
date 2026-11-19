import { Check } from "../../../graphics-common/Check";
import { SketchedShape } from "../../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

const ICON_Y = 284;

type Props = Readonly<{ x: number; accent: string; active: number }>;

/** The stage's ring icon, a check that fades in and a dot that fades out. */
export function StageIcon({ x, accent, active }: Props): ReactNode {
  const style = useGraphicProps("DataPipeline", {});
  const { sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: ICON_Y, r: style.iconRadius }}
        profile={sketch.shape}
        fill={accent}
        fillOpacity={shapes.wash(style.iconFillAlpha)}
        stroke={accent}
        strokeOpacity={style.iconStrokeAlpha}
        strokeWidth={shapes.stroke(style.iconStrokeWidth)}
      />
      <g opacity={active}>
        <Check x={x} y={ICON_Y} color={accent} size={style.checkSize} />
      </g>
      <g opacity={1 - active}>
        <circle cx={x} cy={ICON_Y} r={style.dotRadius} fill={accent} />
      </g>
    </>
  );
}
