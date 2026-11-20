import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CENTER } from "../OrbitalSystem.constants";
import type { ReactNode } from "react";

type Props = Readonly<{
  rx: number;
  ry: number;
  angle: number;
  color: string;
}>;
/** The tilted ellipse a body travels along. */
export function BodyOrbit({ rx, ry, angle, color }: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("OrbitalSystem", {});
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g transform={`rotate(${angle} ${CENTER.x} ${CENTER.y})`}>
      <SketchedShape
        shape={{ kind: "ellipse", cx: CENTER.x, cy: CENTER.y, rx, ry }}
        profile={sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={style.orbitAlpha}
        strokeWidth={shapes.stroke(style.orbitWidth)}
      />
    </g>
  );
}
