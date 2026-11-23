import { SketchedShape } from "../../../primitives/SketchedShape";
import type { getRoutePointFromProgress } from "../../../primitives/RoutePath/getRoutePointFromProgress";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  marker: ReturnType<typeof getRoutePointFromProgress>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  background:
    | NonNullable<string | undefined>
    | ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"]["ground"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the illustrative traversal with authored geometry. */
export function HabitatPlanIllustrativeTraversal({
  input,
  frame,
  marker,
  tokens,
  background,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showIllustrativeTraversal && frame >= 82 ? (
        <SketchedShape
          shape={{
            kind: "circle",
            cx: marker.x * 960,
            cy: marker.y * 960,
            r: 6,
          }}
          profile={tokens.sketch.shape}
          data-illustrative-traversal="true"
          fill={tokens.color.highlight}
          stroke={background}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : undefined}
    </>
  );
}
