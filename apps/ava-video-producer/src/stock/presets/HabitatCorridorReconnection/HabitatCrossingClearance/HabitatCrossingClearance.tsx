import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { makeCorridorRouteFromInputAndFrame } from "../makeCorridorRouteFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  path: ReturnType<typeof makeCorridorRouteFromInputAndFrame>["path"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  background:
    | NonNullable<string | undefined>
    | ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"]["ground"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  crossing: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
};

/** Renders the outline with authored geometry. */
export function HabitatCrossingClearance({
  path,
  tokens,
  background,
  scales,
  crossing,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={tokens.sketch.shape}
      stroke={background}
      strokeWidth={scales.stroke(36)}
      strokeLinejoin="round"
      fill="none"
      opacity={crossing}
    />
  );
}
