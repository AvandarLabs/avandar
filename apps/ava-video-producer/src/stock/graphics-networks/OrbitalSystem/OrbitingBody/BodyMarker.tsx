import { Text } from "../../../graphics-common/Text";
import { SketchedShape } from "../../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = Readonly<{
  x: number;
  y: number;
  label: string;
  color: string;
}>;

/** A body's ringed dot and its label. */
export function BodyMarker({ x, y, label, color }: Props): ReactNode {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: style.bodyRadius }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.bodyAlpha}
        strokeWidth={shapes.stroke(style.bodyStrokeWidth)}
      />
      <circle cx={x} cy={y} r={style.bodyCoreRadius} fill={color} />
      <Text
        role="data"
        x={x}
        y={y - style.bodyLabelOffset}
        fill={color}
        anchor="middle"
      >
        {label}
      </Text>
    </>
  );
}
