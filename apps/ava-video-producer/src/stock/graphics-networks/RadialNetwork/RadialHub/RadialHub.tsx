import { Arrive } from "../../../graphics-common/Arrive/Arrive";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CENTER } from "../RadialNetwork.constants";
import { HubLabels } from "./HubLabels";
import type { Props } from "./RadialHub.types";
import type { ReactNode } from "react";

/** Renders RadialHub within the authored stock graphics. */
export function RadialHub({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "RadialNetwork",
    props: {},
  });
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <Arrive frame={frame}>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: CENTER.x,
          cy: CENTER.y,
          r: style.hubRadius,
        }}
        profile={sketch.shape}
        fill={color.surface}
        stroke={accent}
        strokeOpacity={style.hubStrokeAlpha}
        strokeWidth={shapes.stroke(style.hubStrokeWidth)}
      />
      <HubLabels {...{ input, accent, style, shapes }} />
    </Arrive>
  );
}
